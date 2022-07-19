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

import { ajv } from "../../ajv";
import { APP_CONFIG_FILE_NAME, CommandObj } from "../../const";
import { NETWORKS, Relays } from "../../multiaddr";
import { ensureFluenceDir } from "../../paths";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig";

type DeployedServiceConfigV0 = {
  name: string;
  peerId: string;
  serviceId: string;
  blueprintId: string;
};

type DeployedServiceConfigV1 = {
  serviceId: string;
  peerId: string;
  blueprintId: string;
};

export type DeployedServiceConfig = DeployedServiceConfigV1;

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

type ServicesV1 = Record<string, Array<DeployedServiceConfigV1>>;

type ConfigV1 = {
  version: 1;
  services: ServicesV1;
  keyPairName: string;
  timestamp: string;
  knownRelays?: Array<string>;
  relays?: Relays;
};

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [1] },
    services: {
      type: "object",
      patternProperties: {
        ".*": {
          type: "array",
          items: {
            type: "object",
            properties: {
              peerId: { type: "string" },
              serviceId: { type: "string" },
              blueprintId: { type: "string" },
            },
            required: ["peerId", "serviceId", "blueprintId"],
          },
        },
      },
      required: [],
    },
    keyPairName: { type: "string" },
    timestamp: { type: "string" },
    knownRelays: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
    relays: {
      type: ["string", "array"],
      oneOf: [
        { type: "string", enum: NETWORKS },
        { type: "array", items: { type: "string" } },
      ],
      nullable: true,
    },
  },
  required: ["version", "services", "keyPairName", "timestamp"],
};

export type ServicesV2 = Record<
  string,
  Record<string, Array<DeployedServiceConfigV1>>
>;

type ConfigV2 = {
  version: 2;
  services: ServicesV2;
  keyPairName: string;
  timestamp: string;
  relays?: Relays;
};

const configSchemaV2: JSONSchemaType<ConfigV2> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [2] },
    services: {
      type: "object",
      additionalProperties: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: {
            type: "object",
            properties: {
              peerId: { type: "string" },
              serviceId: { type: "string" },
              blueprintId: { type: "string" },
            },
            required: ["peerId", "serviceId", "blueprintId"],
          },
        },
        required: [],
      },
      required: [],
    },
    keyPairName: { type: "string" },
    timestamp: { type: "string" },
    relays: {
      type: ["string", "array"],
      oneOf: [
        { type: "string", enum: NETWORKS },
        { type: "array", items: { type: "string" } },
      ],
      nullable: true,
    },
  },
  required: ["version", "services", "keyPairName", "timestamp"],
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);
const validateConfigSchemaV1 = ajv.compile(configSchemaV1);

const migrations: Migrations<Config> = [
  (config: Config): ConfigV1 => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${JSON.stringify(
          validateConfigSchemaV0.errors
        )}`
      );
    }

    const { keyPairName, knownRelays, timestamp, services } = config;

    const newServices: ServicesV1 = {};
    for (const { name, peerId, serviceId, blueprintId } of services) {
      const service = {
        peerId,
        serviceId,
        blueprintId,
      };

      const newServicesArr = newServices[name];

      if (newServicesArr === undefined) {
        newServices[name] = [service];
        continue;
      }

      newServicesArr.push(service);
    }

    return {
      version: 1,
      keyPairName,
      timestamp,
      services: newServices,
      ...(knownRelays === undefined ? {} : { knownRelays }),
    };
  },
  (config: Config): ConfigV2 => {
    if (!validateConfigSchemaV1(config)) {
      throw new Error(
        `Migration error. Errors: ${JSON.stringify(
          validateConfigSchemaV0.errors
        )}`
      );
    }

    const {
      keyPairName,
      knownRelays,
      timestamp,
      services,
      relays: relaysFromConfig,
    } = config;
    const relays =
      typeof relaysFromConfig === "string"
        ? relaysFromConfig
        : [...(relaysFromConfig ?? []), ...(knownRelays ?? [])];

    return {
      version: 2,
      keyPairName,
      timestamp,
      services: {
        default: services,
      },
      ...(typeof relays === "string" || relays.length > 0 ? { relays } : {}),
    };
  },
];

type Config = ConfigV0 | ConfigV1 | ConfigV2;
type LatestConfig = ConfigV2;
export type AppConfig = InitializedConfig<LatestConfig>;
export type AppConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1, configSchemaV2],
  latestSchema: configSchemaV2,
  migrations,
  name: APP_CONFIG_FILE_NAME,
  getConfigDirPath: ensureFluenceDir,
};

export const initAppConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyAppConfig =
  getReadonlyConfigInitFunction(initConfigOptions);
export const initNewAppConfig = (
  config: LatestConfig,
  commandObj: CommandObj
): Promise<AppConfig> =>
  getConfigInitFunction(
    initConfigOptions,
    (): LatestConfig => config
  )(commandObj);
export const initNewReadonlyAppConfig = (
  config: LatestConfig,
  commandObj: CommandObj
): Promise<AppConfigReadonly> =>
  getReadonlyConfigInitFunction(
    initConfigOptions,
    (): LatestConfig => config
  )(commandObj);
