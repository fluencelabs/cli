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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import {
  ChainNetwork,
  CHAIN_NETWORKS,
  DEALS_CONFIG_FILE_NAME,
  DEFAULT_WORKER_NAME,
  TOP_LEVEL_SCHEMA_ID,
  WORKERS_CONFIG_FILE_NAME,
} from "../../const.js";
import { ensureFluenceDir, projectRootDir } from "../../paths.js";
import {
  getConfigInitFunction,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  InitConfigOptions,
  ConfigValidateFunction,
} from "../initConfig.js";

import type { WorkersConfigReadonly } from "./workers.js";

export const MIN_WORKERS = 1;
export const TARGET_WORKERS = 3;

type ConfigV0 = {
  version: 0;
  deals: Array<{
    workerName: string;
    minWorkers?: number;
    targetWorkers?: number;
  }>;
  network?: ChainNetwork;
};

const configSchemaV0 = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${DEALS_CONFIG_FILE_NAME}`,
  title: DEALS_CONFIG_FILE_NAME,
  description: "Defines deal configuration for each worker you wanna deploy",
  type: "object",
  properties: {
    deals: {
      description:
        "Array of objects, each object defines a worker and a list of peer IDs to host it on",
      type: "array",
      items: {
        type: "object",
        properties: {
          workerName: {
            type: "string",
            description: `Name of the worker. The same as in ${WORKERS_CONFIG_FILE_NAME}`,
          },
          minWorkers: {
            type: "number",
            description: "Required workers to activate the deal",
            default: MIN_WORKERS,
            nullable: true,
            minimum: 1,
          },
          targetWorkers: {
            type: "number",
            description: "Max workers in the deal",
            default: TARGET_WORKERS,
            nullable: true,
            minimum: 1,
          },
        },
        required: ["workerName"],
      },
    },
    network: {
      type: "string",
      description: "The network in which the transactions will be carried out",
      enum: CHAIN_NETWORKS,
      default: "testnet",
      nullable: true,
    },
    version: { type: "number", enum: [0] },
  },
  required: ["version", "deals"],
} as const satisfies JSONSchemaType<ConfigV0>;

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DealsConfig = InitializedConfig<LatestConfig>;
export type DealsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getDefault = (): LatestConfig => ({
  version: 0,
  deals: [
    {
      workerName: DEFAULT_WORKER_NAME,
    },
  ],
});

const getValidate =
  (
    workersConfig: WorkersConfigReadonly
  ): ConfigValidateFunction<LatestConfig> =>
  (config): ReturnType<ConfigValidateFunction<LatestConfig>> => {
    const workersSet = new Set(
      Object.keys(workersConfig?.workers ?? {}).flatMap(
        (serviceName) => serviceName
      )
    );

    const areWorkerNamesValid = config.deals.reduce<string | true>(
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

    const { error } = config.deals.reduce<{
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
  name: DEALS_CONFIG_FILE_NAME,
  getConfigDirPath: () => projectRootDir,
  getSchemaDirPath: ensureFluenceDir,
  validate: getValidate(workersConfig),
});

export const initDealsConfig = (workersConfig: WorkersConfigReadonly) =>
  getConfigInitFunction(getInitConfigOptions(workersConfig), getDefault)();
export const initReadonlyDealsConfig = (workersConfig: WorkersConfigReadonly) =>
  getReadonlyConfigInitFunction(
    getInitConfigOptions(workersConfig),
    getDefault
  )();

export const dealsSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
