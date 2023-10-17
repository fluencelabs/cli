/**
 * Copyright 2023 Fluence Labs Limited
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

import { rm } from "fs/promises";

import type { JSONSchemaType } from "ajv";

import versions from "../../../versions.json" assert { type: "json" };
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  GLOBAL_CONFIG_FILE_NAME,
  GLOBAL_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  CLI_NAME_FULL,
  AQUA_LIB_NPM_DEPENDENCY,
  AUTO_GENERATED,
} from "../../const.js";
import { genSecretKeyString } from "../../helpers/utils.js";
import {
  validateAllVersionsAreExact,
  validateBatch,
} from "../../helpers/validations.js";
import {
  createSecretKey,
  getUserSecretKey,
  writeSecretKey,
} from "../../keyPairs.js";
import { ensureUserFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
} from "../initConfig.js";

import { initReadonlyUserSecretsConfig } from "./userSecrets.js";

export const CHECK_FOR_UPDATES_DISABLED = "disabled";

type ConfigV0 = {
  version: 0;
  countlyConsent: boolean;
  docsInConfigs?: boolean;
  dependencies?: {
    npm?: Record<string, string>;
    cargo?: Record<string, string>;
  };
  lastCheckForUpdates?: string;
};

const configSchemaV0Obj = {
  type: "object",
  properties: {
    countlyConsent: {
      type: "boolean",
      description: "Weather you consent to send usage data to Countly",
    },
    dependencies: {
      type: "object",
      description: "(For advanced users) Global overrides of dependencies",
      properties: {
        npm: {
          type: "object",
          description: "Overrides of npm dependencies",
          additionalProperties: { type: "string" },
          properties: {
            npm_dependency_name: {
              type: "string",
              description: "npm dependency version",
            },
          },
          nullable: true,
          required: [],
        },
        cargo: {
          type: "object",
          description: "Overrides of cargo dependencies",
          additionalProperties: { type: "string" },
          properties: {
            Cargo_dependency_name: {
              type: "string",
              description: "cargo dependency version",
            },
          },
          nullable: true,
          required: [],
        },
      },
      nullable: true,
      required: [],
    },
    lastCheckForUpdates: {
      type: "string",
      description: `Last time when ${CLI_NAME_FULL} checked for updates. Updates are checked daily unless this field is set to '${CHECK_FOR_UPDATES_DISABLED}'`,
      nullable: true,
    },
    docsInConfigs: {
      type: "boolean",
      description:
        "Whether to include commented-out documented config examples in the configs generated with the CLI",
      nullable: true,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "countlyConsent"],
} as const;

const configSchemaV0: JSONSchemaType<ConfigV0> = configSchemaV0Obj;

type ConfigV1 = Omit<ConfigV0, "version"> & {
  version: 1;
  defaultSecretKeyName: string;
};

const configSchemaV1Obj = {
  ...configSchemaV0Obj,
  $id: `${TOP_LEVEL_SCHEMA_ID}/${GLOBAL_CONFIG_FULL_FILE_NAME}`,
  title: GLOBAL_CONFIG_FULL_FILE_NAME,
  description: `Defines global config for ${CLI_NAME_FULL}`,
  properties: {
    ...configSchemaV0Obj.properties,
    version: { type: "number", const: 1 },
    defaultSecretKeyName: {
      type: "string",
      description:
        "Secret key with this name will be used by default by js-client inside CLI to run Aqua code",
    },
  },
  required: [...configSchemaV0Obj.required, "defaultSecretKeyName"],
} as const;

const configSchemaV1: JSONSchemaType<ConfigV1> = configSchemaV1Obj;

async function getDefault() {
  const userSecretKey = await getUserSecretKey(AUTO_GENERATED);

  if (userSecretKey === undefined) {
    await createSecretKey({
      name: AUTO_GENERATED,
      isUser: true,
      maybeFluenceConfig: null,
    });
  }

  return `# Defines global config for Fluence CLI

# config version
version: 1

# Weather you consent to send usage data to Countly
countlyConsent: false

# Whether to include commented-out documented config examples in the configs generated with the CLI
docsInConfigs: false

# Secret key with this name will be used by default by js-client inside CLI to run Aqua code
defaultSecretKeyName: ${AUTO_GENERATED}

# # Last time when CLI checked for updates.
# # Updates are checked daily unless this field is set to 'disabled'
# lastCheckForUpdates: 2023-07-07T09:31:00.961Z

# # (For advanced users) Overrides for the marine and mrepl dependencies and enumerates npm aqua dependencies globally
# # You can check out current project dependencies using \`fluence dep v\` command
# dependencies:
#   # A map of npm dependency versions
#   # CLI ensures dependencies are installed each time you run aqua
#   # There are also some dependencies that are installed by default (e.g. ${AQUA_LIB_NPM_DEPENDENCY})
#   # You can check default dependencies using \`fluence dep v --default\`
#   # use \`fluence dep npm i --global\` to install global npm dependencies
#   npm:
#     "${AQUA_LIB_NPM_DEPENDENCY}": ${versions.npm[AQUA_LIB_NPM_DEPENDENCY]}
#
#   # A map of cargo dependency versions
#   # CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL
#   # use \`fluence dep cargo i --global\` to install global cargo dependencies
#   cargo:
#     marine: 0.14.0
`;
}

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    const userSecretsConfig = await initReadonlyUserSecretsConfig();

    await Promise.all(
      (userSecretsConfig?.keyPairs ?? []).map(({ name, secretKey }) => {
        return writeSecretKey({
          name,
          secretKey,
          isUser: true,
        });
      }),
    );

    if (userSecretsConfig !== null) {
      await rm(userSecretsConfig.$getPath());
    }

    const { defaultKeyPairName } = userSecretsConfig ?? {};

    if (defaultKeyPairName === undefined) {
      const secretKey = await genSecretKeyString();

      await writeSecretKey({
        name: AUTO_GENERATED,
        secretKey,
        isUser: true,
      });
    }

    return {
      ...config,
      version: 1,
      defaultSecretKeyName: defaultKeyPairName ?? AUTO_GENERATED,
    };
  },
];

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type UserConfig = InitializedConfig<LatestConfig>;
export type UserConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const validate: ConfigValidateFunction<LatestConfig> = async (config) => {
  return validateBatch(
    await validateAllVersionsAreExact(config.dependencies?.npm ?? {}),
    await validateAllVersionsAreExact(config.dependencies?.cargo ?? {}),
  );
};

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
  migrations,
  name: GLOBAL_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureUserFluenceDir,
  validate,
};

export const initUserConfig = getConfigInitFunction(initConfigOptions);

export const initNewUserConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault,
);

export const initReadonlyUserConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const userConfigSchema: JSONSchemaType<LatestConfig> = configSchemaV1;
