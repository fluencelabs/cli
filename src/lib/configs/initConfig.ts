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
    JSON.stringify(schema, null, 2),
    FS_OPTIONS
  );
};

const ensureConfigString = async <LatestConfig extends BaseConfig>(
  configPath: string,
  schemaFileName: string,
  getDefaultConfig: GetDefaultConfig<LatestConfig>
): Promise<string> => {
  try {
    const fileContent = await fsPromises.readFile(configPath, FS_OPTIONS);
    return fileContent;
  } catch {
    const defaultConfigString = yamlDiffPatch(
      `# yaml-language-server: $schema=./${SCHEMAS_DIR_NAME}/${schemaFileName}\n\n{}`,
      {},
      await getDefaultConfig()
    );
    await fsPromises.writeFile(configPath, defaultConfigString, FS_OPTIONS);
    return defaultConfigString;
  }
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
}: {
  configString: string;
  migrations: Migrations<Config>;
  configPath: string;
  validateLatestConfig: ValidateFunction<LatestConfig>;
  config: Config;
}): Promise<LatestConfig> => {
  const migratedConfig = migrations
    .slice(config.version)
    .reduce((config, migration): Config => migration(config), config);

  const migratedConfigString = yamlDiffPatch(
    configString,
    parse(configString),
    migratedConfig
  );
  const parsedMigratedConfig: unknown = parse(migratedConfigString);

  if (!validateLatestConfig(parsedMigratedConfig)) {
    throw new Error(
      `Couldn't migrate config ${color.yellow(
        configPath
      )}. Errors: ${JSON.stringify(validateLatestConfig.errors, null, 2)}`
    );
  }
  if (configString !== migratedConfigString) {
    await fsPromises.writeFile(configPath, migratedConfigString, FS_OPTIONS);
  }
  return parsedMigratedConfig;
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
export type BaseConfig = { version: number };
export type Migrations<T> = Array<(config: T) => T>;
export type GetDefaultConfig<LatestConfig> = () =>
  | LatestConfig
  | Promise<LatestConfig>;
export type GetConfigPath = (
  commandObj: CommandObj
) => string | Promise<string>;

export type InitConfigOptions<
  Config extends BaseConfig,
  LatestConfig extends BaseConfig
> = {
  allSchemas: Array<JSONSchemaType<Config>>;
  latestSchema: JSONSchemaType<LatestConfig>;
  migrations: Migrations<Config>;
  name: string;
  getPath: GetConfigPath;
  getDefault: GetDefaultConfig<LatestConfig>;
};

type InitFunction<LatestConfig> = (
  commandObj: CommandObj,
  configPathOverride?: string
) => Promise<InitializedConfig<LatestConfig>>;

type InitReadonlyFunction<LatestConfig> = (
  commandObj: CommandObj,
  configPathOverride?: string
) => Promise<InitializedReadonlyConfig<LatestConfig>>;

const getConfigPath = (configDirPath: string, name: string): string =>
  path.join(configDirPath, `${name}.yaml`);

export const initReadonlyConfig =
  <Config extends BaseConfig, LatestConfig extends BaseConfig>(
    options: InitConfigOptions<Config, LatestConfig>
  ): InitReadonlyFunction<LatestConfig> =>
  async (
    commandObj: CommandObj,
    configPathOverride?: string
  ): Promise<InitializedReadonlyConfig<LatestConfig>> => {
    const {
      allSchemas: allConfigSchemas,
      latestSchema: latestConfigSchema,
      migrations,
      name,
      getPath,
      getDefault: getDefaultConfig,
    } = options;

    const configDirPath = configPathOverride ?? (await getPath(commandObj));
    const configPath = getConfigPath(configDirPath, name);

    const validateAllConfigVersions = ajv.compile<Config>({
      oneOf: allConfigSchemas,
    });

    const schemaFileName = `${path.parse(configPath).name}.json`;

    await ensureSchema(
      configDirPath,
      schemaFileName,
      validateAllConfigVersions.schema
    );

    const configString = await ensureConfigString(
      configPath,
      schemaFileName,
      getDefaultConfig
    );

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

    const validateLatestConfig = ajv.compile<LatestConfig>(latestConfigSchema);

    const migratedConfig = await migrateConfig({
      config,
      configPath,
      configString,
      migrations,
      validateLatestConfig,
    });

    const migratedConfigString = yamlDiffPatch(
      configString,
      config,
      migratedConfig
    );

    return {
      ...migratedConfig,
      $getPath(): string {
        return configPath;
      },
      $getConfigString(): string {
        return migratedConfigString;
      },
      $validateLatest: validateLatestConfig,
    };
  };

const initializedConfigs = new Set<string>();

export const initConfig =
  <Config extends BaseConfig, LatestConfig extends BaseConfig>(
    options: InitConfigOptions<Config, LatestConfig>
  ): InitFunction<LatestConfig> =>
  async (
    commandObj: CommandObj,
    configPathOverride?: string
  ): Promise<InitializedConfig<LatestConfig>> => {
    const configDirPath =
      configPathOverride ?? (await options.getPath(commandObj));

    const configPath = getConfigPath(configDirPath, options.name);

    if (initializedConfigs.has(configPath)) {
      throw new Error(
        `Config ${configPath} was already initialized. Please initialize each config only once`
      );
    }
    initializedConfigs.add(configPath);

    const initializedReadonlyConfig = await initReadonlyConfig(options)(
      commandObj,
      configPathOverride
    );

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
          await fsPromises.writeFile(configPath, configString, FS_OPTIONS);
        }
      },
      $getConfigString(): string {
        return configString;
      },
    };
  };
