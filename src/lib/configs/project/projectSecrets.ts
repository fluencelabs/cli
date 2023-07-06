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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  PROJECT_SECRETS_CONFIG_FILE_NAME,
  PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const.js";
import {
  validateHasDefault,
  validateBatch,
  validateUnique,
  type ValidationResult,
} from "../../helpers/validations.js";
import { ensureFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type GetDefaultConfig,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";
import { type ConfigKeyPair, configKeyPairSchema } from "../keyPair.js";

type ConfigV0 = {
  version: 0;
  keyPairs: Array<ConfigKeyPair>;
  defaultKeyPairName?: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}`,
  title: PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  type: "object",
  description:
    "Defines project's secret keys that are used only in the scope of this particular Fluence project. You can manage project's keys using commands from `fluence key` group of commands",
  properties: {
    keyPairs: {
      title: "Key Pairs",
      description: "Key Pairs available for the particular project",
      type: "array",
      items: configKeyPairSchema,
    },
    defaultKeyPairName: {
      type: "string",
      nullable: true,
      description: `Key pair with this name will be used for the deployment by default. You can override it with flags or by using keyPair properties in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "keyPairs"],
};

const getDefault: GetDefaultConfig = () => {
  return `keyPairs: []
version: 0`;
};

const migrations: Migrations<Config> = [];

const validate = (config: LatestConfig): ValidationResult => {
  return validateBatch(
    validateUnique(
      config.keyPairs,
      ({ name }): string => {
        return name;
      },
      (name): string => {
        return `There are multiple key-pairs with the same name ${color.yellow(
          name
        )}`;
      }
    ),
    typeof config.defaultKeyPairName === "string"
      ? validateHasDefault(
          config.keyPairs,
          config.defaultKeyPairName,
          ({ name }): string => {
            return name;
          },
          `Default key-pair ${color.yellow(
            config.defaultKeyPairName
          )} not found`
        )
      : true
  );
};

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProjectSecretsConfig = InitializedConfig<LatestConfig>;
export type ProjectSecretsConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: PROJECT_SECRETS_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureFluenceDir,
  validate,
};

export const initProjectSecretsConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initReadonlyProjectSecretsConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const projectSecretsSchema: JSONSchemaType<LatestConfig> =
  configSchemaV0;
