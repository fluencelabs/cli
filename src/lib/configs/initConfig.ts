/**
 * Copyright 2022 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";
import type { AnySchema, JSONSchemaType, ValidateFunction } from "ajv";
import { parse } from "yaml";
import { yamlDiffPatch } from "yaml-diff-patch";

import { ajv } from "../ajv";
import { CommandObj, FS_OPTIONS, SCHEMAS_DIR_NAME } from "../const";
import type { ValidationResult } from "../helpers/validations";
import type { Mutable } from "../typeHelpers";

const ensureSchema = async (
  configDirPath: string,
  schemaFileName: string,
  schema: AnySchema
): Promise<void> => {
  const schemaDir = path.join(configDirPath, SCHEMAS_DIR_NAME);
  await fsPromises.mkdir(schemaDir, { recursive: true });
  await fsPromises.writeFile(
    path.join(schemaDir, schemaFileName),
    JSON.stringify(schema, null, 2) + "\n",
    FS_OPTIONS
  );
};

async function getConfigString(
  configPath: string,
  schemaFileName: string,
  commandObj: CommandObj,
  getDefaultConfig?: undefined
): Promise<string | null>;
async function getConfigString<LatestConfig extends BaseConfig>(
  configPath: string,
  schemaFileName: string,
  commandObj: CommandObj,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): Promise<string>;
async function getConfigString<LatestConfig extends BaseConfig>(
  configPath: string,
  schemaFileName: string,
  commandObj: CommandObj,
  getDefaultConfig?: GetDefaultConfig<LatestConfig> | undefined
): Promise<string | null> {
  try {
    const fileContent = await fsPromises.readFile(configPath, FS_OPTIONS);
    return fileContent;
  } catch {
    if (getDefaultConfig === undefined) {
      return null;
    }
    const defaultConfigString = yamlDiffPatch(
      `# yaml-language-server: $schema=./${SCHEMAS_DIR_NAME}/${schemaFileName}`,
      {},
      await getDefaultConfig(commandObj)
    );
    await fsPromises.writeFile(
      configPath,
      defaultConfigString + "\n",
      FS_OPTIONS
    );
    return defaultConfigString;
  }
}

type MigrateConfigOptions<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
> = {
  configString: string;
  migrations: Migrations<Config>;
  configPath: string;
  validateLatestConfig: ValidateFunction<LatestConfig>;
  config: Config;
  validate: undefined | ((config: LatestConfig) => ValidationResult);
};

const migrateConfig = async <
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>({
  configString,
  migrations,
  configPath,
  validateLatestConfig,
  config,
  validate,
}: MigrateConfigOptions<Config, LatestConfig>): Promise<{
  latestConfig: LatestConfig;
  configString: string;
}> => {
  const migratedConfig = migrations
    .slice(config.version)
    .reduce((config, migration): Config => migration(config), config);

  const migratedConfigString = yamlDiffPatch(
    configString,
    parse(configString),
    migratedConfig
  );
  const latestConfig: unknown = parse(migratedConfigString);

  if (!validateLatestConfig(latestConfig)) {
    throw new Error(
      `Couldn't migrate config ${color.yellow(
        configPath
      )}. Errors: ${JSON.stringify(validateLatestConfig.errors, null, 2)}`
    );
  }
  const maybeValidationError = validate !== undefined && validate(latestConfig);

  if (typeof maybeValidationError === "string") {
    // eslint-disable-next-line unicorn/prefer-type-error
    throw new Error(
      `Invalid config ${color.yellow(
        configPath
      )} after successful migration. Config after migration looks like this:\n\n${migratedConfigString}\n\nErrors: ${maybeValidationError}`
    );
  }
  if (configString !== migratedConfigString) {
    await fsPromises.writeFile(
      configPath,
      migratedConfigString + "\n",
      FS_OPTIONS
    );
  }
  return {
    latestConfig: latestConfig,
    configString: migratedConfigString,
  };
};

type EnsureConfigOptions<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
> = {
  configPath: string;
  validateLatestConfig: ValidateFunction<LatestConfig>;
  config: Config;
  validate: undefined | ((config: LatestConfig) => ValidationResult);
};

const ensureConfigIsValidLatest = <
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>({
  configPath,
  validateLatestConfig,
  config,
  validate,
}: EnsureConfigOptions<Config, LatestConfig>): LatestConfig => {
  if (!validateLatestConfig(config)) {
    throw new Error(
      `Invalid config ${color.yellow(configPath)}. Errors: ${JSON.stringify(
        validateLatestConfig.errors,
        null,
        2
      )}`
    );
  }
  const maybeValidationError = validate !== undefined && validate(config);

  if (typeof maybeValidationError === "string") {
    // eslint-disable-next-line unicorn/prefer-type-error
    throw new Error(
      `Invalid config ${color.yellow(
        configPath
      )}. Errors: ${maybeValidationError}`
    );
  }

  return config;
};

export type InitializedReadonlyConfig<LatestConfig> = Readonly<LatestConfig> & {
  $getPath(): string;
  $getConfigString(): string;
  $validateLatest: ValidateFunction<LatestConfig>;
};
export type InitializedConfig<LatestConfig> = Mutable<
  InitializedReadonlyConfig<LatestConfig>
> & {
  $commit(): Promise<void>;
};
type BaseConfig = { version: number };
export type Migrations<T> = Array<(config: T) => T>;
export type GetDefaultConfig<LatestConfig> = (
  commandObj: CommandObj
) => LatestConfig | Promise<LatestConfig>;
type GetConfigPath = (commandObj: CommandObj) => string | Promise<string>;

export type InitConfigOptions<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
> = {
  allSchemas: Array<JSONSchemaType<Config>>;
  latestSchema: JSONSchemaType<LatestConfig>;
  migrations: Migrations<Config>;
  name: string;
  getPath: GetConfigPath;
  validate?: (config: LatestConfig) => ValidationResult;
};

type InitFunction<LatestConfig> = (
  commandObj: CommandObj,
  configPathOverride?: string
) => Promise<InitializedConfig<LatestConfig> | null>;

type InitFunctionWithDefault<LatestConfig> = (
  commandObj: CommandObj,
  configPathOverride?: string
) => Promise<InitializedConfig<LatestConfig>>;

type InitReadonlyFunction<LatestConfig> = (
  commandObj: CommandObj,
  configPathOverride?: string
) => Promise<InitializedReadonlyConfig<LatestConfig> | null>;

type InitReadonlyFunctionWithDefault<LatestConfig> = (
  commandObj: CommandObj,
  configPathOverride?: string
) => Promise<InitializedReadonlyConfig<LatestConfig>>;

const getConfigPath = (configDirPath: string, name: string): string =>
  path.join(configDirPath, `${name}.yaml`);

export function initReadonlyConfig<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: undefined
): InitReadonlyFunction<LatestConfig>;
export function initReadonlyConfig<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitReadonlyFunctionWithDefault<LatestConfig>;
export function initReadonlyConfig<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitReadonlyFunction<LatestConfig> {
  return async (
    commandObj: CommandObj,
    configPathOverride?: string
  ): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
    const { allSchemas, latestSchema, migrations, name, getPath, validate } =
      options;

    const configDirPath = configPathOverride ?? (await getPath(commandObj));
    const configPath = getConfigPath(configDirPath, name);

    const validateAllConfigVersions = ajv.compile<Config>({
      oneOf: allSchemas,
    });

    const schemaFileName = `${path.parse(configPath).name}.json`;

    await ensureSchema(
      configDirPath,
      schemaFileName,
      validateAllConfigVersions.schema
    );

    const maybeConfigString = await getConfigString(
      configPath,
      schemaFileName,
      commandObj,
      getDefaultConfig
    );
    if (maybeConfigString === null) {
      return null;
    }
    let configString = maybeConfigString;

    const config: unknown = parse(configString);
    if (!validateAllConfigVersions(config)) {
      throw new Error(
        `Invalid config at ${color.yellow(
          configPath
        )}. Errors: ${JSON.stringify(
          validateAllConfigVersions.errors,
          null,
          2
        )}`
      );
    }

    const validateLatestConfig = ajv.compile<LatestConfig>(latestSchema);

    let latestConfig: LatestConfig;
    if (config.version < migrations.length) {
      ({ latestConfig, configString } = await migrateConfig({
        config,
        configPath,
        configString,
        migrations,
        validateLatestConfig,
        validate,
      }));
    } else {
      latestConfig = ensureConfigIsValidLatest({
        config,
        configPath,
        validateLatestConfig,
        validate,
      });
    }

    return {
      ...latestConfig,
      $getPath(): string {
        return configPath;
      },
      $getConfigString(): string {
        return configString;
      },
      $validateLatest: validateLatestConfig,
    };
  };
}

const initializedConfigs = new Set<string>();

export function initConfig<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: undefined
): InitFunction<LatestConfig>;
export function initConfig<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitFunctionWithDefault<LatestConfig>;
export function initConfig<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitFunction<LatestConfig> {
  return async (
    commandObj: CommandObj,
    configPathOverride?: string
  ): Promise<InitializedConfig<LatestConfig> | null> => {
    const configDirPath =
      configPathOverride ?? (await options.getPath(commandObj));
    const configPath = getConfigPath(configDirPath, options.name);

    if (initializedConfigs.has(configPath)) {
      throw new Error(
        `Config ${configPath} was already initialized. Please initialize readonly config instead or use previously initialized mutable config`
      );
    }
    initializedConfigs.add(configPath);

    const maybeInitializedReadonlyConfig = await initReadonlyConfig(
      options,
      getDefaultConfig
    )(commandObj, configPathOverride);
    if (maybeInitializedReadonlyConfig === null) {
      return null;
    }
    const initializedReadonlyConfig = maybeInitializedReadonlyConfig;

    let configString = initializedReadonlyConfig.$getConfigString();

    return {
      ...initializedReadonlyConfig,
      async $commit(): Promise<void> {
        if (!initializedReadonlyConfig.$validateLatest(this)) {
          throw new Error(
            `Couldn't save config ${color.yellow(
              configPath
            )}. Errors: ${JSON.stringify(
              initializedReadonlyConfig.$validateLatest.errors,
              null,
              2
            )}`
          );
        }

        const config = { ...this };

        for (const key in config) {
          if (
            Object.prototype.hasOwnProperty.call(config, key) &&
            typeof config[key] === "function"
          ) {
            delete config[key];
          }
        }

        const newConfigString = yamlDiffPatch(
          configString,
          parse(configString),
          config
        );

        if (configString !== newConfigString) {
          configString = newConfigString;
          await fsPromises.writeFile(
            configPath,
            configString + "\n",
            FS_OPTIONS
          );
        }
      },
      $getConfigString(): string {
        return configString;
      },
    };
  };
}
