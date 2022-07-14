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

import color from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import { AUTO_GENERATED, SECRETS_FILE_NAME } from "../../const";
import {
  validateHasDefault,
  validateMultiple,
  validateUnique,
  ValidationResult,
} from "../../helpers/validations";
import {
  ConfigKeyPair,
  configKeyPairSchema,
  generateKeyPair,
} from "../../keypairs";
import { ensureUserFluenceDir } from "../../paths";
import {
  GetDefaultConfig,
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig";

type ConfigV0 = {
  version: 0;
  keyPairs: Array<ConfigKeyPair>;
  defaultKeyPairName: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    defaultKeyPairName: { type: "string" },
    keyPairs: {
      type: "array",
      items: configKeyPairSchema,
    },
  },
  required: ["version", "keyPairs", "defaultKeyPairName"],
};

const getDefault: GetDefaultConfig<
  LatestConfig
> = async (): Promise<LatestConfig> => ({
  version: 0,
  keyPairs: [await generateKeyPair(AUTO_GENERATED)],
  defaultKeyPairName: AUTO_GENERATED,
});

const migrations: Migrations<Config> = [];

const validate = (config: LatestConfig): ValidationResult =>
  validateMultiple(
    validateUnique(
      config.keyPairs,
      ({ name }): string => name,
      (name): string =>
        `There are multiple key-pairs with the same name ${color.yellow(name)}`
    ),
    validateHasDefault(
      config.keyPairs,
      config.defaultKeyPairName,
      ({ name }): string => name,
      `Default key-pair ${color.yellow(config.defaultKeyPairName)} not found`
    )
  );

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type UserSecretsConfig = InitializedConfig<LatestConfig>;
export type UserSecretsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: SECRETS_FILE_NAME,
  getPath: ensureUserFluenceDir,
  validate,
};

export const initUserSecretsConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initReadonlyUserSecretsConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);
