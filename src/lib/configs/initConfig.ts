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
import { CommandObj, FS_OPTIONS, SCHEMAS_DIR_NAME, YAML_EXT } from "../const";
import { replaceHomeDir } from "../helpers/replaceHomeDir";
import type { ValidationResult } from "../helpers/validations";
import type { Mutable } from "../typeHelpers";

type SchemaOptions = {
  name: string;
  configDirPath: string;
  getSchemaDirPath: GetPath | undefined;
  commandObj: CommandObj;
  schema: AnySchema;
};

const ensureSchema = async ({
  name,
  configDirPath,
  getSchemaDirPath,
  commandObj,
  schema,
}: SchemaOptions): Promise<string> => {
  const schemaDir = path.join(
    getSchemaDirPath === undefined
      ? configDirPath
      : await getSchemaDirPath(commandObj),
    SCHEMAS_DIR_NAME
  );
  await fsPromises.mkdir(schemaDir, { recursive: true });
  const schemaPath = path.join(schemaDir, `${name}.json`);
  await fsPromises.writeFile(
    path.join(schemaDir, `${name}.json`),
    JSON.stringify(schema, null, 2) + "\n",
    FS_OPTIONS
  );
  return path.relative(configDirPath, schemaPath);
};

type GetConfigString<LatestConfig> = {
  configPath: string;
  schemaRelativePath: string;
  commandObj: CommandObj;
  getDefaultConfig: GetDefaultConfig<LatestConfig> | undefined;
  examples: string | undefined;
};

const getConfigString = async <LatestConfig extends BaseConfig>({
  configPath,
  schemaRelativePath,
  commandObj,
  getDefaultConfig,
  examples,
}: GetConfigString<LatestConfig>): Promise<string | null> => {
  const schemaPathCommentStart = "# yaml-language-server: $schema=";
  const schemaPathComment = `${schemaPathCommentStart}${schemaRelativePath}`;
  let configString: string;
  try {
    const fileContent = await fsPromises.readFile(configPath, FS_OPTIONS);
    configString = fileContent.startsWith(schemaPathCommentStart)
      ? [schemaPathComment, ...fileContent.split("\n").slice(1)].join("\n")
      : `${schemaPathComment}\n${fileContent}`;
  } catch {
    if (getDefaultConfig === undefined) {
      return null;
    }
    configString = yamlDiffPatch(
      `${schemaPathComment}\n\n${
        examples === undefined
          ? ""
          : `EXAMPLES:${examples}`
              .split("\n")
              .map((ex): string => `# ${ex}`)
              .join("\n")
      }\n`,
      {},
      await getDefaultConfig(commandObj)
    );
  }
  await fsPromises.writeFile(configPath, configString + "\n", FS_OPTIONS);
  return configString;
};

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
  let migratedConfig = config;
  for (const migration of migrations.slice(config.version)) {
    // eslint-disable-next-line no-await-in-loop
    migratedConfig = await migration(migratedConfig);
  }

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
export type Migrations<Config> = Array<
  (config: Config) => Config | Promise<Config>
>;
export type GetDefaultConfig<LatestConfig> = (
  commandObj: CommandObj
) => LatestConfig | Promise<LatestConfig>;
type GetPath = (commandObj: CommandObj) => string | Promise<string>;

export type InitConfigOptions<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
> = {
  allSchemas: Array<JSONSchemaType<Config>>;
  latestSchema: JSONSchemaType<LatestConfig>;
  migrations: Migrations<Config>;
  name: string;
  getPath: GetPath;
  getSchemaDirPath?: GetPath;
  validate?: (config: LatestConfig) => ValidationResult;
  examples?: string;
};

type InitFunction<LatestConfig> = (
  commandObj: CommandObj
) => Promise<InitializedConfig<LatestConfig> | null>;

type InitFunctionWithDefault<LatestConfig> = (
  commandObj: CommandObj
) => Promise<InitializedConfig<LatestConfig>>;

type InitReadonlyFunction<LatestConfig> = (
  commandObj: CommandObj
) => Promise<InitializedReadonlyConfig<LatestConfig> | null>;

type InitReadonlyFunctionWithDefault<LatestConfig> = (
  commandObj: CommandObj
) => Promise<InitializedReadonlyConfig<LatestConfig>>;

const getConfigPath = (configDirPath: string, name: string): string =>
  path.join(configDirPath, `${name}.${YAML_EXT}`);

export function getReadonlyConfigInitFunction<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: undefined
): InitReadonlyFunction<LatestConfig>;
export function getReadonlyConfigInitFunction<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitReadonlyFunctionWithDefault<LatestConfig>;
export function getReadonlyConfigInitFunction<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitReadonlyFunction<LatestConfig> {
  return async (
    commandObj: CommandObj
  ): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
    const {
      allSchemas,
      latestSchema,
      migrations,
      name,
      getPath,
      validate,
      getSchemaDirPath,
      examples,
    } = options;

    const configDirPath = await getPath(commandObj);
    const configPath = getConfigPath(configDirPath, name);

    const validateAllConfigVersions = ajv.compile<Config>({
      oneOf: allSchemas,
    });

    const validateLatestConfig = ajv.compile<LatestConfig>(latestSchema);

    const schemaRelativePath = await ensureSchema({
      name,
      configDirPath,
      getSchemaDirPath,
      commandObj,
      schema: validateLatestConfig.schema,
    });

    const maybeConfigString = await getConfigString({
      configPath,
      schemaRelativePath,
      commandObj,
      getDefaultConfig,
      examples,
    });
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

export function getConfigInitFunction<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: never
): InitFunction<LatestConfig>;
export function getConfigInitFunction<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig: GetDefaultConfig<LatestConfig>
): InitFunctionWithDefault<LatestConfig>;
export function getConfigInitFunction<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>(
  options: InitConfigOptions<Config, LatestConfig>,
  getDefaultConfig?: GetDefaultConfig<LatestConfig>
): InitFunction<LatestConfig> {
  return async (
    commandObj: CommandObj
  ): Promise<InitializedConfig<LatestConfig> | null> => {
    const configDirPath = await options.getPath(commandObj);
    const configPath = getConfigPath(configDirPath, options.name);

    if (initializedConfigs.has(configPath)) {
      throw new Error(
        `Mutable config ${replaceHomeDir(
          configPath
        )} was already initialized. Please initialize readonly config instead or use previously initialized mutable config`
      );
    }
    initializedConfigs.add(configPath);

    const maybeInitializedReadonlyConfig = await getReadonlyConfigInitFunction(
      options,
      getDefaultConfig
    )(commandObj);
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
