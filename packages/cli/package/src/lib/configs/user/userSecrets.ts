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
  TOP_LEVEL_SCHEMA_ID,
  USER_SECRETS_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
import {
  validateHasDefault,
  validateBatch,
  validateUnique,
  type ValidationResult,
} from "../../helpers/validations.js";
import { ensureUserFluenceDir } from "../../paths.js";
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
  defaultKeyPairName: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${USER_SECRETS_CONFIG_FULL_FILE_NAME}`,
  title: USER_SECRETS_CONFIG_FULL_FILE_NAME,
  description: `Defines user's secret keys that can be used across different Fluence projects. You can manage user's keys using commands from \`${CLI_NAME} key\` group of commands with \`--user\` flag`,
  properties: {
    defaultKeyPairName: { type: "string" },
    keyPairs: {
      title: "Key Pairs",
      type: "array",
      items: configKeyPairSchema,
    },
    version: { type: "integer", const: 0 },
  },
  required: ["version", "keyPairs", "defaultKeyPairName"],
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
    validateHasDefault(
      config.keyPairs,
      config.defaultKeyPairName,
      ({ name }): string => {
        return name;
      },
      `Default key-pair ${color.yellow(config.defaultKeyPairName)} not found`,
    ),
  );
};

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type UserSecretsConfig = InitializedConfig<LatestConfig>;
export type UserSecretsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: USER_SECRETS_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureUserFluenceDir,
  validate,
};

export const initReadonlyUserSecretsConfig =
  getReadonlyConfigInitFunction(initConfigOptions);
