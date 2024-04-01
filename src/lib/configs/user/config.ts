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

import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  GLOBAL_CONFIG_FILE_NAME,
  GLOBAL_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  CLI_NAME_FULL,
  AUTO_GENERATED,
} from "../../const.js";
import {
  createSecretKey,
  genSecretKeyString,
  getUserSecretKey,
  writeSecretKey,
} from "../../keyPairs.js";
import { ensureUserFluenceDir } from "../../paths.js";
import { setUserConfig } from "../globalConfigs.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

import { initReadonlyUserSecretsConfig } from "./userSecrets.js";

const CHECK_FOR_UPDATES_DISABLED = "disabled";

type ConfigV0 = {
  version: 0;
  countlyConsent: boolean;
  docsInConfigs?: boolean;
  lastCheckForUpdates?: string;
};

const configSchemaV0Obj = {
  type: "object",
  additionalProperties: false,
  properties: {
    countlyConsent: {
      type: "boolean",
      description: "Weather you consent to send usage data to Countly",
    },
    lastCheckForUpdates: {
      type: "string",
      description: `DEPRECATED. It's currently advised to install CLI without using npm (See README.md: https://github.com/fluencelabs/cli?tab=readme-ov-file#installation-and-usage). Last time when ${CLI_NAME_FULL} checked for updates. Updates are checked daily unless this field is set to '${CHECK_FOR_UPDATES_DISABLED}'`,
      nullable: true,
    },
    docsInConfigs: {
      type: "boolean",
      description:
        "Whether to include commented-out documented config examples in the configs generated with the CLI",
      nullable: true,
    },
    version: { type: "integer", const: 0 },
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
    version: { type: "integer", const: 1 },
    defaultSecretKeyName: {
      type: "string",
      description:
        "Secret key with this name will be used by default by js-client inside CLI to run Aqua code",
    },
  },
  required: [...configSchemaV0Obj.required, "defaultSecretKeyName"],
} as const;

const configSchemaV1: JSONSchemaType<ConfigV1> = configSchemaV1Obj;

function getDefault() {
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
      await writeSecretKey({
        name: AUTO_GENERATED,
        secretKey: await genSecretKeyString(),
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

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
  migrations,
  name: GLOBAL_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureUserFluenceDir,
};

export const initUserConfig = getConfigInitFunction(initConfigOptions);

export async function initNewUserConfig() {
  const userConfig = await getConfigInitFunction(
    initConfigOptions,
    getDefault,
  )();

  setUserConfig(userConfig);

  const userSecretKey = await getUserSecretKey(AUTO_GENERATED);

  if (userSecretKey === undefined) {
    await createSecretKey({
      name: AUTO_GENERATED,
      isUser: true,
      maybeFluenceConfig: null,
      askToSetKeyAsDefaultInteractively: false,
    });
  }

  return userConfig;
}

export const initReadonlyUserConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const userConfigSchema: JSONSchemaType<LatestConfig> = configSchemaV1;
