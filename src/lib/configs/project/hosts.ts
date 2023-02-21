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

import assert from "node:assert";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import {
  DEFAULT_WORKER_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  HOSTS_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  WORKERS_CONFIG_FILE_NAME,
} from "../../const.js";
import { local } from "../../localNodes.js";
import { FluenceEnv, getPeerId, getRandomRelayId } from "../../multiaddres.js";
import { ensureFluenceDir, projectRootDirPromise } from "../../paths.js";
import { FLUENCE_ENV } from "../../setupEnvironment.js";
import {
  getConfigInitFunction,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  InitConfigOptions,
  ConfigValidateFunction,
} from "../initConfig.js";

import type { FluenceConfigReadonly } from "./fluence.js";
import type { WorkersConfigReadonly } from "./workers.js";

type ConfigV0 = {
  version: 0;
  hosts: Array<{ workerName: string; peerIds: Array<string> }>;
};

const configSchemaV0 = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${HOSTS_CONFIG_FILE_NAME}`,
  title: HOSTS_CONFIG_FILE_NAME,
  description: "Defines which workers to host on which peer IDs",
  type: "object",
  properties: {
    hosts: {
      description:
        "Array of objects, each object defines a worker and a list of peer IDs to host it on",
      type: "array",
      items: {
        type: "object",
        properties: {
          workerName: {
            type: "string",
            description: `Name of the worker to host. The same as in ${WORKERS_CONFIG_FILE_NAME}`,
          },
          peerIds: {
            type: "array",
            description: "An array of peer IDs to deploy on",
            items: { type: "string" },
          },
        },
        required: ["workerName", "peerIds"],
      },
    },
    version: { type: "number", enum: [0] },
  },
  required: ["version", "hosts"],
} as const satisfies JSONSchemaType<ConfigV0>;

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type HostsConfig = InitializedConfig<LatestConfig>;
export type HostsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getDefaultPeerId = (fluenceConfig: FluenceConfigReadonly): string => {
  if (Array.isArray(fluenceConfig?.relays)) {
    const firstRelay = fluenceConfig?.relays[0];

    assert(
      firstRelay !== undefined,
      `relays array is empty in ${FLUENCE_CONFIG_FILE_NAME}`
    );

    return getPeerId(firstRelay);
  }

  // This typescript error happens only when running config docs generation script that's why type assertion is used
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unnecessary-type-assertion
  const fluenceEnv = (fluenceConfig?.relays ??
    process.env[FLUENCE_ENV]) as FluenceEnv;

  if (fluenceEnv === "local") {
    const localNode = local[0];
    assert(localNode !== undefined);
    return localNode.peerId;
  }

  return getRandomRelayId(fluenceEnv);
};

const getDefault =
  (fluenceConfig: FluenceConfigReadonly) => (): LatestConfig => ({
    version: 0,
    hosts: [
      {
        workerName: DEFAULT_WORKER_NAME,
        peerIds: [getDefaultPeerId(fluenceConfig)],
      },
    ],
  });

const getValidate =
  (
    workersConfig: WorkersConfigReadonly
  ): ConfigValidateFunction<LatestConfig> =>
  (config): ReturnType<ConfigValidateFunction<LatestConfig>> => {
    if (config.hosts === undefined) {
      return true;
    }

    const workersSet = new Set(
      Object.keys(workersConfig?.workers ?? {}).flatMap(
        (serviceName) => serviceName
      )
    );

    const areWorkerNamesValid = config.hosts.reduce<string | true>(
      (acc, { workerName }) => {
        if (workersSet.has(workerName)) {
          return acc;
        }

        const errorMessage = `No worker named ${color.yellow(
          workerName
        )} found in ${WORKERS_CONFIG_FILE_NAME}`;

        if (typeof acc === "string") {
          return `${acc}\n${errorMessage}`;
        }

        return errorMessage;
      },
      true
    );

    if (typeof areWorkerNamesValid === "string") {
      return areWorkerNamesValid;
    }

    const { error } = config.hosts.reduce<{
      error: string;
      workerNames: Set<string>;
    }>(
      (acc, { workerName }) => {
        if (acc.workerNames.has(workerName)) {
          return {
            ...acc,
            error: `${acc.error}\nDuplicate worker name: ${workerName}`,
          };
        }

        const newSet = acc.workerNames.add(workerName);

        return { ...acc, workerNames: newSet };
      },
      { error: "", workerNames: new Set() }
    );

    if (error === "") {
      return true;
    }

    return error;
  };

export const getInitConfigOptions = (
  workersConfig: WorkersConfigReadonly
): InitConfigOptions<Config, LatestConfig> => ({
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: HOSTS_CONFIG_FILE_NAME,
  getConfigDirPath: (): Promise<string> => projectRootDirPromise,
  getSchemaDirPath: ensureFluenceDir,
  validate: getValidate(workersConfig),
});

export const initHostsConfig = (
  fluenceConfig: FluenceConfigReadonly,
  workersConfig: WorkersConfigReadonly
) =>
  getConfigInitFunction(
    getInitConfigOptions(workersConfig),
    getDefault(fluenceConfig)
  )();
export const initReadonlyHostsConfig = (
  fluenceConfig: FluenceConfigReadonly,
  workersConfig: WorkersConfigReadonly
) =>
  getReadonlyConfigInitFunction(
    getInitConfigOptions(workersConfig),
    getDefault(fluenceConfig)
  )();

export const hostsSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
