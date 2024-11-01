/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import assert from "node:assert";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import { jsonStringify } from "../../common.js";
import { validationErrorToString, getAjv } from "../ajvInstance.js";
import { commandObj } from "../commandObj.js";
import {
  FS_OPTIONS,
  YAML_EXT,
  YML_EXT,
  CLI_NAME_FULL,
  SCHEMAS_DIR_NAME,
} from "../const.js";
import { numToStr } from "../helpers/typesafeStringify.js";
import { removeProperties } from "../helpers/utils.js";

import { formatConfig, type GetPath } from "./initConfig.js";
import type {
  InitializedConfig,
  InitConfigOptions,
  GetLatestConfig,
  GetDefaultConfig,
  OptionsTuple,
  ConfigOptionsWithoutMigrate,
  ConfigOptions,
} from "./initConfigNewTypes.js";

const initializedConfigs = new Map<string, InitializedConfig<unknown>>();

export function getConfigInitFunction<
  C0,
  C1 = undefined,
  C2 = undefined,
  C3 = undefined,
  C4 = undefined,
  C5 = undefined,
  C6 = undefined,
  C7 = undefined,
  C8 = undefined,
  C9 = undefined,
>(
  options: InitConfigOptions<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>,
  getDefaultConfig?: never,
): () => Promise<InitializedConfig<
  GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>
> | null>;
export function getConfigInitFunction<
  C0,
  C1 = undefined,
  C2 = undefined,
  C3 = undefined,
  C4 = undefined,
  C5 = undefined,
  C6 = undefined,
  C7 = undefined,
  C8 = undefined,
  C9 = undefined,
>(
  options: InitConfigOptions<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>,
  getDefaultConfig: GetDefaultConfig<
    GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>
  >,
): () => Promise<
  InitializedConfig<GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>>
>;

export function getConfigInitFunction<
  C0,
  C1 = undefined,
  C2 = undefined,
  C3 = undefined,
  C4 = undefined,
  C5 = undefined,
  C6 = undefined,
  C7 = undefined,
  C8 = undefined,
  C9 = undefined,
>(
  {
    options,
    getSchemaDirPath,
    getConfigPath,
    description,
  }: InitConfigOptions<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>,
  getDefaultConfig?: GetDefaultConfig<
    GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>
  >,
): () => Promise<InitializedConfig<
  GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>
> | null> {
  type LatestConfig = GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>;

  return async () => {
    const expectedConfigPath = await getConfigPath();

    const previouslyInitializedConfig =
      initializedConfigs.get(expectedConfigPath);

    if (previouslyInitializedConfig !== undefined) {
      // It's safe to assert here because we can be sure that previouslyInitializedConfig has the same type
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return previouslyInitializedConfig as InitializedConfig<LatestConfig>;
    }

    if (
      !expectedConfigPath.endsWith(YAML_EXT) &&
      !expectedConfigPath.endsWith(YML_EXT)
    ) {
      commandObj.error(
        `Invalid config path ${color.yellow(
          expectedConfigPath,
        )}. Config path must end with ${color.yellow(YAML_EXT)} or ${color.yellow(
          YML_EXT,
        )}`,
      );
    }

    await addTitleDescriptionAndVersionToSchemas({
      options,
      description,
      getConfigPath,
    });

    const getLatestConfigRes = await getLatestConfig({
      options,
      expectedConfigPath,
      getDefaultConfig,
      getSchemaDirPath,
    });

    if (getLatestConfigRes === null) {
      return null;
    }

    const { yamlDiffPatch } = await import("yaml-diff-patch");

    const {
      latestConfig,
      latestConfigString,
      actualConfigPath,
      validateLatestConfig,
    } = getLatestConfigRes;

    let prevConfigString = latestConfigString;

    const initializedConfig: InitializedConfig<LatestConfig> = {
      ...latestConfig,
      $getPath(): string {
        return actualConfigPath;
      },
      async $commit(): Promise<void> {
        const config = removeProperties(this, ([, v]) => {
          return typeof v === "function";
        });

        prevConfigString = await saveConfig(
          actualConfigPath,
          yamlDiffPatch(prevConfigString, {}, config),
          prevConfigString,
        );

        await validateLatestConfig(config);
      },
    };

    initializedConfigs.set(expectedConfigPath, initializedConfig);
    return initializedConfig;
  };
}

export async function addTitleDescriptionAndVersionToSchemas<
  C0,
  C1 = undefined,
  C2 = undefined,
  C3 = undefined,
  C4 = undefined,
  C5 = undefined,
  C6 = undefined,
  C7 = undefined,
  C8 = undefined,
  C9 = undefined,
>({
  options,
  description,
  getConfigPath,
}: InitConfigOptions<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>) {
  const expectedConfigPath = await getConfigPath();
  const title = `${getConfigName(expectedConfigPath)}.${YAML_EXT}`;

  options.forEach(({ schema }, version) => {
    schema.title = title;
    schema.description = description;

    schema.properties.version = {
      type: "integer",
      const: version,
      description: "Config version",
    };

    if (schema.required?.includes("version") !== true) {
      schema.required = [...(schema.required ?? []), "version"];
    }
  });

  return options;
}

function getConfigValidator<Config>({
  actualConfigPath,
  configOptions: { schema, validate },
}: {
  actualConfigPath: string;
  configOptions: ConfigOptionsWithoutMigrate<Config>;
}) {
  return async function validateConfig(config: unknown): Promise<Config> {
    const validateConfigSchema = getAjv().compile<Config>(schema);

    if (!validateConfigSchema(config)) {
      return commandObj.error(
        `Invalid config at ${color.yellow(
          actualConfigPath,
        )}. ${await validationErrorToString(validateConfigSchema.errors)}`,
      );
    }

    const validity =
      validate === undefined ? true : await validate(config, actualConfigPath);

    if (typeof validity === "string") {
      return commandObj.error(
        `Invalid config at ${color.yellow(actualConfigPath)}. Errors:\n${validity}`,
      );
    }

    return config;
  };
}

async function getLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>({
  options,
  expectedConfigPath,
  getDefaultConfig,
  getSchemaDirPath,
}: {
  options: OptionsTuple<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>;
  expectedConfigPath: string;
  getDefaultConfig:
    | GetDefaultConfig<GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>>
    | undefined;
  getSchemaDirPath: GetPath | undefined;
}): Promise<{
  latestConfig: GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>;
  latestConfigString: string;
  actualConfigPath: string;
  validateLatestConfig: ReturnType<
    typeof getConfigValidator<
      GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>
    >
  >;
} | null> {
  type LatestConfig = GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>;

  const [{ parse }, { yamlDiffPatch }] = await Promise.all([
    import("yaml"),
    import("yaml-diff-patch"),
  ]);

  let configString: string;
  let actualConfigPath = expectedConfigPath;

  try {
    // try reading config file
    // if it fails, try replacing .yaml with .yml or vice versa and read again
    // this way we can support both .yaml and .yml extensions interchangeably
    try {
      configString = await readFile(actualConfigPath, FS_OPTIONS);
    } catch {
      const endsWithYaml = actualConfigPath.endsWith(YAML_EXT);

      // try reading again by replacing .yaml with .yml or vice versa
      const newConfigPath = `${actualConfigPath.slice(
        0,
        -(endsWithYaml ? YAML_EXT : YML_EXT).length,
      )}${endsWithYaml ? YML_EXT : YAML_EXT}`;

      configString = await readFile(newConfigPath, FS_OPTIONS);
      actualConfigPath = newConfigPath;
    }
  } catch {
    if (getDefaultConfig === undefined) {
      return null;
    }

    const latestConfigOptions = options[options.length - 1];
    const { description } = latestConfigOptions.schema;

    assert(
      description !== undefined,
      `Unreachable. addVersionTitleAndDescriptionToConfigOptions function must ensure that description is defined`,
    );

    configString = yamlDiffPatch(
      `# ${description}\n\n`,
      {},
      { version: options.length - 1, ...(await getDefaultConfig()) },
    );
  }

  const currentConfigUnknown: unknown = parse(configString);

  if (
    typeof currentConfigUnknown !== "object" ||
    currentConfigUnknown === null
  ) {
    return commandObj.error(
      `Invalid config at ${color.yellow(actualConfigPath)}. Expected to be an object`,
    );
  }

  let currentConfig = currentConfigUnknown;
  let prevConfig = currentConfig;

  if (!validateConfigHasVersion(currentConfig)) {
    return commandObj.error(
      `Invalid config at ${color.yellow(
        actualConfigPath,
      )}. Expected to have an integer ${color.yellow("version")} property`,
    );
  }

  const { version: initialVersion } = currentConfig;
  const configDirName = dirname(actualConfigPath);

  const schemaDir = join(
    getSchemaDirPath === undefined ? configDirName : await getSchemaDirPath(),
    SCHEMAS_DIR_NAME,
  );

  await mkdir(schemaDir, { recursive: true });
  const schemaPath = join(schemaDir, `${getConfigName(actualConfigPath)}.json`);
  const schemaPathComment = `${SCHEMA_PATH_COMMENT_START}${relative(configDirName, schemaPath)}`;

  let currentConfigString = configString.startsWith(SCHEMA_PATH_COMMENT_START)
    ? [schemaPathComment, ...configString.split("\n").slice(1)].join("\n")
    : `${schemaPathComment}\n${configString}`;

  let validateCurrentConfig: undefined | ((config: object) => Promise<object>) =
    undefined;

  // the exact type of configs is irrelevant further
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const relevantOptions = options.slice(initialVersion) as ConfigOptions<
    object,
    object
  >[];

  if (relevantOptions.length === 0) {
    return commandObj.error(
      `Invalid config at ${color.yellow(
        actualConfigPath,
      )}. Unknown ${color.yellow(`version: ${numToStr(initialVersion)}`)}. Consider updating ${CLI_NAME_FULL} to the latest version`,
    );
  }

  for (const [indexString, configOptions] of Object.entries(relevantOptions)) {
    const index = Number(indexString);

    // No need to migrate for the current config version
    if (index !== 0) {
      prevConfig = currentConfig;
      const migrated = await configOptions.migrate(prevConfig);
      currentConfig = { ...migrated, version: initialVersion + index };
    }

    await updateSchema(configOptions, schemaPath);

    currentConfigString = await saveConfig(
      actualConfigPath,
      yamlDiffPatch(currentConfigString, {}, currentConfig),
      index === 0 ? configString : currentConfigString,
    );

    validateCurrentConfig = getConfigValidator({
      configOptions,
      actualConfigPath,
    });

    currentConfig = await validateCurrentConfig(currentConfig);
  }

  return {
    actualConfigPath,
    latestConfigString: currentConfigString,
    // The latest config here and below is ensured by the fact that by this point we have already migrated the config to the latest version
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    latestConfig: currentConfig as LatestConfig,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    validateLatestConfig: validateCurrentConfig as ReturnType<
      typeof getConfigValidator<LatestConfig>
    >,
  };
}

const objWithVersionSchema: JSONSchemaType<{ version: number }> = {
  type: "object",
  properties: { version: { type: "integer" } },
  required: ["version"],
};

const validateConfigHasVersion = getAjv().compile(objWithVersionSchema);
const SCHEMA_PATH_COMMENT_START = "# yaml-language-server: $schema=";

async function updateSchema(
  configOptions: ConfigOptionsWithoutMigrate<object>,
  schemaPath: string,
) {
  const schemaString = `${jsonStringify(configOptions.schema)}\n`;

  try {
    const actualSchemaString = await readFile(schemaPath, FS_OPTIONS);
    assert(actualSchemaString === schemaString);
  } catch {
    await writeFile(schemaPath, schemaString, FS_OPTIONS);
  }
}

async function saveConfig(
  configPath: string,
  configString: string,
  prevConfigString?: string,
): Promise<string> {
  if (prevConfigString === configString) {
    return configString;
  }

  const newConfigString = formatConfig(configString);
  await writeFile(configPath, newConfigString, FS_OPTIONS);
  return newConfigString;
}

function getConfigName(configPath: string) {
  return basename(configPath).replace(/\.(yml|yaml)$/, "");
}
