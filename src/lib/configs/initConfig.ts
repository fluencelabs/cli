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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { AnySchema, JSONSchemaType, ValidateFunction } from "ajv";
import Ajv from "ajv";
import { parse } from "yaml";
import { yamlDiffPatch } from "yaml-diff-patch";

import { FS_OPTIONS, SCHEMAS_DIR_NAME, YAML_EXT } from "../const.js";
import { jsonStringify } from "../helpers/jsonStringify.js";
import { replaceHomeDir } from "../helpers/replaceHomeDir.js";
import type { ValidationResult } from "../helpers/validations.js";
import { commandObj } from "../lifecyle.js";
import type { Mutable } from "../typeHelpers.js";

type EnsureSchemaArg = {
  name: string;
  configDirPath: string;
  getSchemaDirPath: GetPath | undefined;
  schema: AnySchema;
};

const ensureSchema = async ({
  name,
  configDirPath,
  getSchemaDirPath,
  schema,
}: EnsureSchemaArg): Promise<string> => {
  const schemaDir = path.join(
    getSchemaDirPath === undefined ? configDirPath : await getSchemaDirPath(),
    SCHEMAS_DIR_NAME
  );

  await fsPromises.mkdir(schemaDir, { recursive: true });
  const schemaPath = path.join(schemaDir, `${name}.json`);

  await fsPromises.writeFile(
    path.join(schemaDir, `${name}.json`),
    jsonStringify(schema) + "\n",
    FS_OPTIONS
  );

  return path.relative(configDirPath, schemaPath);
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
  validate: undefined | ConfigValidateFunction<LatestConfig>;
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
      )}. Errors: ${jsonStringify(validateLatestConfig.errors)}`
    );
  }

  const maybeValidationError =
    validate !== undefined && (await validate(latestConfig, configPath));

  if (typeof maybeValidationError === "string") {
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
    latestConfig,
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
  validate: undefined | ConfigValidateFunction<LatestConfig>;
};

const ensureConfigIsValidLatest = async <
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
>({
  configPath,
  validateLatestConfig,
  config,
  validate,
}: EnsureConfigOptions<Config, LatestConfig>): Promise<LatestConfig> => {
  if (!validateLatestConfig(config)) {
    throw new Error(
      `Invalid config ${color.yellow(configPath)}. Errors: ${jsonStringify(
        validateLatestConfig.errors
      )}`
    );
  }

  const maybeValidationError =
    validate !== undefined && (await validate(config, configPath));

  if (typeof maybeValidationError === "string") {
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
type BaseConfig = { version: number } & Record<string, unknown>;
export type Migrations<Config> = Array<
  (config: Config) => Config | Promise<Config>
>;
export type GetDefaultConfig<LatestConfig> = () =>
  | LatestConfig
  | Promise<LatestConfig>;
type GetPath = () => string | Promise<string>;

export type ConfigValidateFunction<LatestConfig> = (
  config: LatestConfig,
  configPath: string
) => ValidationResult | Promise<ValidationResult>;

export type InitConfigOptions<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
> = {
  allSchemas: Array<JSONSchemaType<Config>>;
  latestSchema: JSONSchemaType<LatestConfig>;
  migrations: Migrations<Config>;
  name: string;
  getConfigDirPath: GetPath;
  getSchemaDirPath?: GetPath;
  validate?: ConfigValidateFunction<LatestConfig>;
};

type InitFunction<LatestConfig> =
  () => Promise<InitializedConfig<LatestConfig> | null>;

type InitFunctionWithDefault<LatestConfig> = () => Promise<
  InitializedConfig<LatestConfig>
>;

type InitReadonlyFunction<LatestConfig> =
  () => Promise<InitializedReadonlyConfig<LatestConfig> | null>;

type InitReadonlyFunctionWithDefault<LatestConfig> = () => Promise<
  InitializedReadonlyConfig<LatestConfig>
>;

export const getConfigPath = (configDirPath: string, name: string): string =>
  path.join(configDirPath, name);

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
  return async (): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
    const {
      allSchemas,
      latestSchema,
      migrations,
      name,
      getConfigDirPath,
      validate,
      getSchemaDirPath,
    } = options;

    const configDirPath = await getConfigDirPath();
    const configPath = getConfigPath(configDirPath, name);

    const validateAllConfigVersions = new Ajv.default({
      allowUnionTypes: true,
    }).compile<Config>({
      oneOf: allSchemas,
    });

    const validateLatestConfig = new Ajv.default({
      allowUnionTypes: true,
    }).compile<LatestConfig>(latestSchema);

    const schemaPathCommentStart = "# yaml-language-server: $schema=";

    const getSchemaPathComment = async (): Promise<string> =>
      `${schemaPathCommentStart}${await ensureSchema({
        name,
        configDirPath,
        getSchemaDirPath,
        schema: validateLatestConfig.schema,
      })}`;

    let configString: string;

    try {
      // If config file exists, read it and add schema path comment if it's missing
      // or replace it if it's incorrect
      const fileContent = await fsPromises.readFile(configPath, FS_OPTIONS);
      const schemaPathComment = await getSchemaPathComment();

      configString = fileContent.startsWith(schemaPathCommentStart)
        ? `${[schemaPathComment, ...fileContent.split("\n").slice(1)]
            .join("\n")
            .trim()}\n`
        : `${schemaPathComment}\n${fileContent.trim()}\n`;

      if (configString !== fileContent) {
        await fsPromises.writeFile(configPath, configString, FS_OPTIONS);
      }
    } catch {
      if (getDefaultConfig === undefined) {
        // If config file doesn't exist and there is no default config, return null
        return null;
      }
      // If config file doesn't exist, create it with default config and schema path comment

      const documentationLinkComment = `# Documentation: https://github.com/fluencelabs/fluence-cli/tree/main/docs/configs/${name.replace(
        `.${YAML_EXT}`,
        ""
      )}.md`;

      const schemaPathComment = await getSchemaPathComment();

      const description =
        typeof latestSchema["description"] === "string"
          ? `\n\n# ${latestSchema["description"]}`
          : "";

      configString = yamlDiffPatch(
        `${schemaPathComment}${description}\n\n${documentationLinkComment}\n\n`,
        {},
        await getDefaultConfig()
      );

      await fsPromises.writeFile(
        configPath,
        `${configString.trim()}\n`,
        FS_OPTIONS
      );
    }

    const config: unknown = parse(configString);

    if (!validateAllConfigVersions(config)) {
      return commandObj.error(
        `Invalid config at ${color.yellow(configPath)}. Errors: ${jsonStringify(
          validateAllConfigVersions.errors
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
      latestConfig = await ensureConfigIsValidLatest({
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
  return async (): Promise<InitializedConfig<LatestConfig> | null> => {
    const configPath = getConfigPath(
      await options.getConfigDirPath(),
      options.name
    );

    if (initializedConfigs.has(configPath)) {
      throw new Error(
        `Mutable config ${replaceHomeDir(
          configPath
        )} was already initialized. Please initialize readonly config instead or use previously initialized mutable config`
      );
    }

    const maybeInitializedReadonlyConfig = await getReadonlyConfigInitFunction(
      options,
      getDefaultConfig
    )();

    if (maybeInitializedReadonlyConfig === null) {
      return null;
    }

    initializedConfigs.add(configPath);

    const initializedReadonlyConfig = maybeInitializedReadonlyConfig;

    let configString = initializedReadonlyConfig.$getConfigString();

    return {
      ...initializedReadonlyConfig,
      async $commit(): Promise<void> {
        if (!initializedReadonlyConfig.$validateLatest(this)) {
          throw new Error(
            `Couldn't save config ${color.yellow(
              configPath
            )}. Errors: ${jsonStringify(
              initializedReadonlyConfig.$validateLatest.errors
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

        const newConfigString = `${yamlDiffPatch(
          configString,
          parse(configString),
          config
        ).trim()}\n`;

        if (configString !== newConfigString) {
          configString = newConfigString;

          await fsPromises.writeFile(configPath, configString, FS_OPTIONS);
        }
      },
      $getConfigString(): string {
        return configString;
      },
    };
  };
}
