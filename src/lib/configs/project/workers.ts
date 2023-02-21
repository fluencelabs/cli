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
  DEFAULT_WORKER_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  WORKERS_CONFIG_FILE_NAME,
} from "../../const.js";
import { ensureFluenceDir, projectRootDirPromise } from "../../paths.js";
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

type ConfigV0 = {
  version: 0;
  workers: Record<
    string,
    {
      services: Array<string>;
    }
  >;
};

const configSchemaV0 = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${WORKERS_CONFIG_FILE_NAME}`,
  title: WORKERS_CONFIG_FILE_NAME,
  description:
    "Defines workers and what they consist of. Currently worker includes a set of services that you want to deploy on a particular peer",
  type: "object",
  properties: {
    workers: {
      description:
        "A Map with worker names as keys and worker configs as values",
      type: "object",
      additionalProperties: {
        type: "object",
        description: "Worker config",
        properties: {
          services: {
            description: `An array of service names to include in this worker. Service names must be listed in ${FLUENCE_CONFIG_FILE_NAME}`,
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["services"],
      },
      required: [],
    },
    version: { type: "number", enum: [0] },
  },
  required: ["version", "workers"],
} as const satisfies JSONSchemaType<ConfigV0>;

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type WorkersConfig = InitializedConfig<LatestConfig>;
export type WorkersConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getDefault = (): LatestConfig => ({
  version: 0,
  workers: {
    [DEFAULT_WORKER_NAME]: {
      services: [],
    },
  },
});

const getValidate =
  (
    fluenceConfig: FluenceConfigReadonly
  ): ConfigValidateFunction<LatestConfig> =>
  (config): ReturnType<ConfigValidateFunction<LatestConfig>> => {
    if (config.workers === undefined) {
      return true;
    }

    const servicesSet = new Set(
      Object.keys(fluenceConfig.services ?? {}).flatMap(
        (serviceName) => serviceName
      )
    );

    return Object.entries(config.workers).reduce<string | true>(
      (acc, [workerName, workerConfig]) => {
        const servicesNotListedInFluenceYAML = workerConfig.services.filter(
          (serviceName) => !servicesSet.has(serviceName)
        );

        if (servicesNotListedInFluenceYAML.length === 0) {
          return acc;
        }

        const errorMessage = `Worker ${color.yellow(
          workerName
        )} has services that are not listed in ${FLUENCE_CONFIG_FILE_NAME}: ${color.yellow(
          servicesNotListedInFluenceYAML.join(",")
        )}`;

        if (typeof acc === "string") {
          return `${acc}\n${errorMessage}`;
        }

        return errorMessage;
      },
      true
    );
  };

export const getInitConfigOptions = (
  fluenceConfig: FluenceConfigReadonly
): InitConfigOptions<Config, LatestConfig> => ({
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: WORKERS_CONFIG_FILE_NAME,
  getConfigDirPath: (): Promise<string> => projectRootDirPromise,
  getSchemaDirPath: ensureFluenceDir,
  validate: getValidate(fluenceConfig),
});

export const initWorkersConfig = (fluenceConfig: FluenceConfigReadonly) =>
  getConfigInitFunction(getInitConfigOptions(fluenceConfig), getDefault)();
export const initReadonlyWorkersConfig = (
  fluenceConfig: FluenceConfigReadonly
) =>
  getReadonlyConfigInitFunction(
    getInitConfigOptions(fluenceConfig),
    getDefault
  )();

export const workersSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
