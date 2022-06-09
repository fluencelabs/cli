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

import type { JSONSchemaType } from "ajv";

import { APP_FILE_NAME, CommandObj } from "../../const";
import { getProjectFluenceDirPath } from "../../pathsGetters/getProjectFluenceDirPath";
import {
  initConfig,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  initReadonlyConfig,
  Migrations,
} from "../initConfig";

type DeployedServiceConfigV0 = {
  name: string;
  peerId: string;
  serviceId: string;
  blueprintId: string;
};

export type DeployedServiceConfig = DeployedServiceConfigV0;

type ConfigV0 = {
  version: 0;
  services: Array<DeployedServiceConfigV0>;
  keyPairName: string;
  timestamp: string;
  knownRelays?: Array<string>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          peerId: { type: "string" },
          serviceId: { type: "string" },
          blueprintId: { type: "string" },
        },
        required: ["name", "peerId", "serviceId", "blueprintId"],
      },
    },
    keyPairName: { type: "string" },
    timestamp: { type: "string" },
    knownRelays: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
  },
  required: ["version", "services", "keyPairName", "timestamp"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type AppConfig = InitializedConfig<LatestConfig>;
export type AppConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: APP_FILE_NAME,
  getPath: getProjectFluenceDirPath,
};

export const initAppConfig = initConfig(initConfigOptions);
export const initReadonlyAppConfig = initReadonlyConfig(initConfigOptions);
export const initNewAppConfig = (
  config: LatestConfig,
  commandObj: CommandObj
): Promise<AppConfig> =>
  initConfig(initConfigOptions, (): LatestConfig => config)(commandObj);
export const initNewReadonlyAppConfig = (
  config: LatestConfig,
  commandObj: CommandObj
): Promise<AppConfigReadonly> =>
  initReadonlyConfig(initConfigOptions, (): LatestConfig => config)(commandObj);
