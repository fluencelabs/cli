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

import type { ValidateFunction } from "ajv";
import { parse } from "yaml";
import { yamlDiffPatch } from "yaml-diff-patch";
import color from "@oclif/color";

import { FS_OPTIONS, SCHEMAS_DIR_NAME } from "../const";

const getFullSchemaName = (configName: string): string => `${configName}.json`;

const ensureSchema = async <T>({
  configDir,
  configName,
  validateConfig,
}: GetConfigOptions<T>): Promise<void> => {
  const schemaDir = path.join(configDir, SCHEMAS_DIR_NAME);
  await fsPromises.mkdir(schemaDir, { recursive: true });
  return fsPromises.writeFile(
    path.join(schemaDir, getFullSchemaName(configName)),
    JSON.stringify(validateConfig.schema, null, 2),
    FS_OPTIONS
  );
};

const getEmptyConfigString = (configName: string): string =>
  `# yaml-language-server: $schema=./${SCHEMAS_DIR_NAME}/${getFullSchemaName(
    configName
  )}\n\n{}`;

const getConfigString = async <T extends { version: number }>(
  configPath: string,
  configName: string,
  getDefaultConfig: () => T | Promise<T>
): Promise<string> => {
  try {
    const content = await fsPromises.readFile(configPath, FS_OPTIONS);
    return content;
  } catch {
    const defaultConfig = yamlDiffPatch(
      getEmptyConfigString(configName),
      {},
      await getDefaultConfig()
    );

    await fsPromises.writeFile(configPath, defaultConfig, FS_OPTIONS);

    return defaultConfig;
  }
};

export type UpdateConfig<T> = (update: (previousConfig: T) => T) => Promise<T>;

const getUpdateConfig = <T>(
  configStr: string,
  validateConfig: ValidateFunction<T>,
  configPath: string
): UpdateConfig<T> => {
  let configString = configStr;
  let config: unknown = parse(configString);

  return async (editCallback): Promise<T> => {
    const newConfig = editCallback(parse(configString));
    const newConfigString = yamlDiffPatch(configString, config, newConfig);

    configString = newConfigString;
    config = parse(newConfigString);

    if (!validateConfig(config)) {
      throw new Error(
        `Couldn't save config ${color.yellow(
          configPath
        )}. Errors: ${JSON.stringify(validateConfig.errors, null, 2)}`
      );
    }

    await fsPromises.writeFile(configPath, newConfigString, FS_OPTIONS);

    return newConfig;
  };
};

type GetConfigOptions<T> = {
  configName: string;
  configDir: string;
  migrations: Array<(config: T) => T>;
  validateConfig: ValidateFunction<T>;
  getDefaultConfig: () => Promise<T> | T;
};

export const getConfig = async <T extends { version: number }>(
  options: GetConfigOptions<T>
): Promise<Error | [T, UpdateConfig<T>]> => {
  const configPath = path.join(options.configDir, `${options.configName}.yaml`);
  await ensureSchema(options);
  let configString = await getConfigString(
    configPath,
    options.configName,
    options.getDefaultConfig
  );

  const config: unknown = parse(configString);

  const { migrations, validateConfig } = options;

  if (!validateConfig(config)) {
    return new Error(
      `Invalid config at ${color.yellow(configPath)}. Errors: ${JSON.stringify(
        validateConfig.errors,
        null,
        2
      )}`
    );
  }

  const migratedConfig = migrations
    .slice(config.version)
    .reduce((config, migration): T => migration(config), config);

  const migratedConfigString = yamlDiffPatch(
    configString,
    parse(configString),
    migratedConfig
  );

  const newConfig: unknown = parse(migratedConfigString);

  if (!validateConfig(newConfig)) {
    return new Error(
      `Couldn't migrate config ${color.yellow(
        configPath
      )}. Errors: ${JSON.stringify(validateConfig.errors, null, 2)}`
    );
  }

  if (configString !== migratedConfigString) {
    await fsPromises.writeFile(configPath, migratedConfigString, FS_OPTIONS);
    configString = migratedConfigString;
  }

  return [
    migratedConfig,
    getUpdateConfig(configString, validateConfig, configPath),
  ];
};
