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
import { isAbsolute, resolve } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { buildModules } from "./build.js";
import { commandObj } from "./commandObj.js";
import type { UploadArgConfig } from "./compiled-aqua/installation-spell/config.js";
import { spellInstallAirScript } from "./compiled-aqua/installation-spell/spell.js";
import type { InitializedReadonlyConfig } from "./configs/initConfig.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { initFluenceLockConfig } from "./configs/project/fluenceLock.js";
import {
  ConfigV0,
  initReadonlyModuleConfig,
  ModuleConfigReadonly,
} from "./configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
} from "./configs/project/service.js";
import type { WorkersConfigReadonly } from "./configs/project/workers.js";
import {
  MODULE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
  WORKERS_CONFIG_FILE_NAME,
} from "./const.js";
import {
  downloadModule,
  getModuleWasmPath,
  getServiceDirAbsolutePath,
  isUrl,
} from "./helpers/downloadFile.js";
import { initMarineCli } from "./marineCli.js";
import { projectRootDir } from "./paths.js";

export const parseWorkers = (workerNamesString: string) =>
  workerNamesString.split(",").map((s) => s.trim());

type PrepareForDeployArg = {
  workerNames: string | undefined;
  fluenceConfig: FluenceConfig;
  arrayWithWorkerNames: Array<{ workerName: string; peerIds?: Array<string> }>;
  workersConfig: WorkersConfigReadonly;
};

export const prepareForDeploy = async ({
  workerNames: workerNamesString,
  arrayWithWorkerNames,
  fluenceConfig,
  workersConfig,
}: PrepareForDeployArg): Promise<UploadArgConfig> => {
  const workerNamesSet = [
    ...new Set(arrayWithWorkerNames.map(({ workerName }) => workerName)),
  ];

  const workersToHost =
    workerNamesString === undefined
      ? workerNamesSet
      : parseWorkers(workerNamesString);

  const workersFromWorkersConfig = Object.keys(workersConfig.workers);

  const workerNamesNotFoundInWorkersConfig = workersToHost.filter(
    (workerName) => !workersFromWorkersConfig.includes(workerName)
  );

  if (workerNamesNotFoundInWorkersConfig.length !== 0) {
    commandObj.error(
      `Wasn't able to find workers ${workerNamesNotFoundInWorkersConfig
        .map((workerName) => color.yellow(workerName))
        .join(", ")} in ${color.yellow(
        WORKERS_CONFIG_FILE_NAME
      )} please check the spelling and try again`
    );
  }

  const workerConfigs = workersToHost.map((workerName) => {
    const workerConfig = workersConfig.workers[workerName];
    assert(workerConfig !== undefined);
    return {
      workerName,
      workerConfig,
    };
  });

  const serviceNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => workerConfig.services)
    ),
  ];

  const serviceConfigs = await Promise.all(
    serviceNames.map((serviceName) =>
      (async () => {
        const { get = undefined, overrideModules = undefined } =
          fluenceConfig?.services?.[serviceName] ?? {};

        assert(get !== undefined);

        const serviceDirPath = await getServiceDirAbsolutePath(
          get,
          projectRootDir
        );

        const serviceConfig = await initReadonlyServiceConfig(serviceDirPath);

        if (serviceConfig === null) {
          return commandObj.error(
            `${
              isUrl(get)
                ? `Downloaded invalid service ${color.yellow(
                    serviceName
                  )} from ${color.yellow(get)}`
                : `Invalid service ${color.yellow(serviceName)}`
            }. No ${SERVICE_CONFIG_FILE_NAME} found at ${color.yellow(
              serviceDirPath
            )}`
          );
        }

        return {
          serviceName,
          overrideModules,
          serviceConfig,
          serviceDirPath,
        };
      })()
    )
  );

  const modulesUrls = [
    ...new Set(
      serviceConfigs
        .flatMap(({ serviceConfig }) =>
          Object.values(serviceConfig.modules).map(({ get }) => get)
        )
        .filter((get) => isUrl(get))
    ),
  ];

  const modulePathsMap = new Map<string, string>(
    await Promise.all(
      modulesUrls.map(
        (url): Promise<[string, string]> =>
          (async () => [url, await downloadModule(url)])()
      )
    )
  );

  serviceConfigs
    .flatMap(({ serviceConfig, serviceDirPath }) =>
      Object.values(serviceConfig.modules).map(({ get }) => ({
        get,
        serviceDirPath,
      }))
    )
    .filter(({ get }) => !isUrl(get))
    .forEach(({ get, serviceDirPath }) => {
      if (isAbsolute(get)) {
        modulePathsMap.set(get, get);
        return;
      }

      const absolutePath = resolve(serviceDirPath, get);
      modulePathsMap.set(absolutePath, absolutePath);
    });

  const moduleConfigsMap = new Map<string, InitializedReadonlyConfig<ConfigV0>>(
    await Promise.all(
      [...modulePathsMap.entries()].map(([absolutePathOrUrl, moduleDirPath]) =>
        (async (): Promise<[string, InitializedReadonlyConfig<ConfigV0>]> => {
          const moduleConfig = await initReadonlyModuleConfig(moduleDirPath);

          if (moduleConfig === null) {
            return commandObj.error(
              `${
                isUrl(absolutePathOrUrl)
                  ? `Downloaded invalid module from ${color.yellow(
                      absolutePathOrUrl
                    )}`
                  : `Invalid module`
              }. No ${MODULE_CONFIG_FILE_NAME} found at ${color.yellow(
                moduleDirPath
              )}`
            );
          }

          return [absolutePathOrUrl, moduleConfig];
        })()
      )
    )
  );

  const fluenceLockConfig = await initFluenceLockConfig();
  const marineCli = await initMarineCli(fluenceConfig, fluenceLockConfig);
  await buildModules([...moduleConfigsMap.values()], marineCli);

  const workers: UploadArgConfig["workers"] = arrayWithWorkerNames
    .filter(({ workerName }) => workersToHost.includes(workerName))
    .map(({ workerName, peerIds = [] }) => {
      const workerConfig = workersConfig.workers[workerName];
      assert(workerConfig !== undefined);

      const services = workerConfig.services.map((serviceName) => {
        const serviceConfig = serviceConfigs.find(
          ({ serviceName: name }) => name === serviceName
        );

        assert(serviceConfig !== undefined);
        const { overrideModules = undefined } = serviceConfig;

        const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
          serviceConfig.serviceConfig.modules;

        const modules = [
          ...Object.entries(otherModules),
          [FACADE_MODULE_NAME, facadeModule] as const,
        ].map(([name, { get }]) => {
          const moduleConfig = moduleConfigsMap.get(
            isUrl(get) || isAbsolute(get)
              ? get
              : resolve(serviceConfig.serviceDirPath, get)
          );

          assert(moduleConfig !== undefined);

          const overriddenModuleConfig = {
            ...moduleConfig,
            ...overrideModules?.[name],
          };

          return {
            wasm: getModuleWasmPath(overriddenModuleConfig),
            config: JSON.stringify(
              serviceModuleToJSONModuleConfig(overriddenModuleConfig)
            ),
          };
        });

        return {
          name: serviceName,
          modules,
        };
      });

      return {
        name: workerName,
        hosts: peerIds,
        config: {
          services,
          spells: [],
        },
      };
    });

  return {
    workers,
    installation_script: spellInstallAirScript,
    installation_trigger: {
      clock: { start_sec: 1676293670, end_sec: 0, period_sec: 600 },
      connections: { connect: false, disconnect: false },
      blockchain: { start_block: 0, end_block: 0 },
    },
  };
};

/* eslint-disable camelcase */
type JSONModuleConf = {
  name: string;
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  mapped_dirs?: Array<[string, string]>;
  preopened_files?: Array<string>;
  envs?: Array<[string, string]>;
  mounted_binaries?: Array<[string, string]>;
};

const serviceModuleToJSONModuleConfig = (
  moduleConfig: ModuleConfigReadonly
): JSONModuleConf => {
  const {
    name,
    loggerEnabled,
    loggingMask,
    volumes,
    envs,
    maxHeapSize,
    mountedBinaries,
    preopenedFiles,
  } = moduleConfig;

  const jsonModuleConfig: JSONModuleConf = {
    name,
  };

  if (loggerEnabled === true) {
    jsonModuleConfig.logger_enabled = true;
  }

  if (typeof loggingMask === "number") {
    jsonModuleConfig.logging_mask = loggingMask;
  }

  if (typeof maxHeapSize === "string") {
    jsonModuleConfig.max_heap_size = maxHeapSize;
  }

  if (volumes !== undefined) {
    jsonModuleConfig.mapped_dirs = Object.entries(volumes);
    jsonModuleConfig.preopened_files = [...new Set(Object.values(volumes))];
  }

  if (preopenedFiles !== undefined) {
    jsonModuleConfig.preopened_files = [
      ...new Set([...Object.values(volumes ?? {}), ...preopenedFiles]),
    ];
  }

  if (envs !== undefined) {
    jsonModuleConfig.envs = Object.entries(envs);
  }

  if (mountedBinaries !== undefined) {
    jsonModuleConfig.mounted_binaries = Object.entries(mountedBinaries);
  }

  return jsonModuleConfig;
};
/* eslint-enable camelcase */
