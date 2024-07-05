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

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import {
  CLI_NAME,
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
import { getFluenceDir } from "../../paths.js";
import {
  getReadonlyConfigInitFunction,
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
  description: `Defines project's secret keys that are used only in the scope of this particular Fluence project. You can manage project's keys using commands from \`${CLI_NAME} key\` group of commands`,
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
    version: { type: "integer", const: 0 },
  },
  required: ["version", "keyPairs"],
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
          name,
        )}`;
      },
    ),
    typeof config.defaultKeyPairName === "string"
      ? validateHasDefault(
          config.keyPairs,
          config.defaultKeyPairName,
          ({ name }): string => {
            return name;
          },
          `Default key-pair ${color.yellow(
            config.defaultKeyPairName,
          )} not found`,
        )
      : true,
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
  getConfigOrConfigDirPath: getFluenceDir,
  validate,
};

export const initReadonlyProjectSecretsConfig =
  getReadonlyConfigInitFunction(initConfigOptions);
