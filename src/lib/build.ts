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

import assert from "node:assert";

import { color } from "@oclif/color";

import type {
  FluenceConfigReadonly,
  OverrideModules,
} from "../lib/configs/project/fluence.js";
import {
  initReadonlyModuleConfig,
  type ModuleConfigReadonly,
} from "../lib/configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  type ServiceModuleV0,
  type ServiceConfigReadonly,
} from "../lib/configs/project/service.js";
import {
  MODULE_CONFIG_FULL_FILE_NAME,
  SERVICE_CONFIG_FULL_FILE_NAME,
} from "../lib/const.js";
import {
  getUrlOrAbsolutePath,
  getModuleWasmPath,
  isUrl,
} from "../lib/helpers/downloadFile.js";
import type { MarineCLI } from "../lib/marineCli.js";

import { buildModules } from "./buildModules.js";
import { commandObj } from "./commandObj.js";
import { updateAquaServiceInterfaceFile } from "./helpers/generateServiceInterface.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { projectRootDir } from "./paths.js";

type ModuleNameAndConfigDefinedInService = {
  moduleName: string;
  moduleConfig: ServiceModuleV0;
};
type ServiceInfoWithUnresolvedModuleConfigs = {
  serviceName: string;
  serviceDirPath: string;
  moduleNamesAndConfigsDefinedInService: Array<ModuleNameAndConfigDefinedInService>;
};

type ServiceInfo = Omit<
  ServiceInfoWithUnresolvedModuleConfigs,
  "moduleNamesAndConfigsDefinedInService" | "serviceDirPath"
> & {
  moduleConfigs: Array<ModuleConfigReadonly & { wasmPath: string }>;
};

type ResolveServiceInfosArg = {
  fluenceConfig: FluenceConfigReadonly;
};

const resolveServiceInfos = async ({
  fluenceConfig,
}: ResolveServiceInfosArg): Promise<
  ServiceInfoWithUnresolvedModuleConfigs[]
> => {
  type ServiceConfigPromises = Promise<{
    serviceName: string;
    serviceConfig: ServiceConfigReadonly;
  }>;

  startSpinner("Making sure all services are downloaded");

  const serviceConfigs = await Promise.all(
    Object.entries(fluenceConfig.services ?? []).map(
      async ([serviceName, { get }]): ServiceConfigPromises => {
        return {
          serviceName,
          serviceConfig:
            (await initReadonlyServiceConfig(get, projectRootDir)) ??
            commandObj.error(
              `Service ${color.yellow(serviceName)} must have ${color.yellow(
                SERVICE_CONFIG_FULL_FILE_NAME,
              )}. ${
                isUrl(get)
                  ? `Not able to find it after downloading and decompressing ${color.yellow(
                      get,
                    )}`
                  : `Not able to find it at ${color.yellow(get)}`
              }`,
            ),
        };
      },
    ),
  );

  stopSpinner();

  return Promise.all(
    serviceConfigs.map(({ serviceName, serviceConfig }) => {
      return {
        serviceName,
        serviceDirPath: serviceConfig.$getDirPath(),
        moduleNamesAndConfigsDefinedInService:
          getModuleNamesAndConfigsDefinedInServices(serviceConfig.modules),
      };
    }),
  );
};

type BuildArg = ResolveServiceInfosArg & {
  marineCli: MarineCLI;
  marineBuildArgs: string | undefined;
};

export const build = async ({
  marineCli,
  marineBuildArgs,
  ...resolveDeployInfosArg
}: BuildArg): Promise<Array<ServiceInfo>> => {
  const serviceInfos = await resolveServiceInfos(resolveDeployInfosArg);

  const setOfAllModuleUrlsOrAbsolutePaths = new Set(
    serviceInfos.flatMap(
      ({
        moduleNamesAndConfigsDefinedInService: modules,
        serviceDirPath,
      }): Array<string> => {
        return modules.map(({ moduleConfig: { get } }): string => {
          return getUrlOrAbsolutePath(get, serviceDirPath);
        });
      },
    ),
  );

  const mapOfModuleConfigs = new Map(
    await Promise.all(
      [...setOfAllModuleUrlsOrAbsolutePaths].map(
        async (
          moduleAbsolutePathOrUrl,
        ): Promise<[string, ModuleConfigReadonly]> => {
          const maybeModuleConfig = await initReadonlyModuleConfig(
            moduleAbsolutePathOrUrl,
          );

          if (maybeModuleConfig === null) {
            return commandObj.error(
              `Module at: ${color.yellow(
                moduleAbsolutePathOrUrl,
              )} doesn't have ${color.yellow(MODULE_CONFIG_FULL_FILE_NAME)}`,
            );
          }

          return [moduleAbsolutePathOrUrl, maybeModuleConfig];
        },
      ),
    ),
  );

  if (serviceInfos.length > 0) {
    startSpinner("Making sure all services are built");

    await buildModules(
      [...mapOfModuleConfigs.values()],
      marineCli,
      marineBuildArgs,
      resolveDeployInfosArg.fluenceConfig,
    );

    stopSpinner();
  }

  const serviceNamePathToFacadeMap: Record<string, string> = {};

  const serviceInfoWithModuleConfigs = serviceInfos.map(
    ({
      moduleNamesAndConfigsDefinedInService: modules,
      serviceDirPath,
      ...rest
    }): ServiceInfo => {
      const moduleConfigs = modules.map(
        ({
          moduleConfig: { get, ...overrides },
        }): ModuleConfigReadonly & { wasmPath: string } => {
          const moduleConfig = mapOfModuleConfigs.get(
            getUrlOrAbsolutePath(get, serviceDirPath),
          );

          if (moduleConfig === undefined) {
            throw new Error(
              `Unreachable. Wasn't able to find module config for ${get}`,
            );
          }

          const overriddenModuleConfig = { ...moduleConfig, ...overrides };

          return {
            ...overriddenModuleConfig,
            wasmPath: getModuleWasmPath(overriddenModuleConfig),
          };
        },
      );

      const facadeModuleConfig = moduleConfigs.at(-1);

      assert(
        facadeModuleConfig !== undefined,
        "Unreachable. Each service must have at least one module",
      );

      serviceNamePathToFacadeMap[rest.serviceName] =
        facadeModuleConfig.wasmPath;

      return {
        moduleConfigs,
        ...rest,
      };
    },
  );

  await updateAquaServiceInterfaceFile(
    serviceNamePathToFacadeMap,
    resolveDeployInfosArg.fluenceConfig.services,
    marineCli,
  );

  return serviceInfoWithModuleConfigs;
};

const resolveSingleServiceModuleConfigs = (
  serviceConfig: ServiceConfigReadonly,
  overridesFromFluenceYAMLMap: OverrideModules | undefined,
) => {
  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfig.modules;

  const modulesWithNames = [
    ...Object.entries(otherModules),
    [FACADE_MODULE_NAME, facadeModule] as const,
  ];

  return Promise.all(
    modulesWithNames.map(
      async ([name, { get, ...overridesFromServiceYAML }]) => {
        const overridesFromFluenceYAML = overridesFromFluenceYAMLMap?.[name];

        const maybeModuleConfig = await initReadonlyModuleConfig(
          get,
          serviceConfig.$getDirPath(),
        );

        if (maybeModuleConfig === null) {
          stopSpinner(color.red("error"));
          return commandObj.error(
            `Cant find module config at ${color.yellow(get)}`,
          );
        }

        return {
          ...maybeModuleConfig,
          ...overridesFromServiceYAML,
          ...overridesFromFluenceYAML,
        };
      },
    ),
  );
};

export const resolveSingleServiceModuleConfigsAndBuild = async (
  serviceConfig: ServiceConfigReadonly,
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null,
  marineCli: MarineCLI,
  marineBuildArgs: string | undefined,
) => {
  const maybeOverridesFromFluenceCOnfig =
    maybeFluenceConfig?.services?.[serviceConfig.name]?.overrideModules;

  const moduleConfigs = await resolveSingleServiceModuleConfigs(
    serviceConfig,
    maybeOverridesFromFluenceCOnfig,
  );

  await buildModules(
    moduleConfigs,
    marineCli,
    marineBuildArgs,
    maybeFluenceConfig,
  );

  const facadeModuleConfig = moduleConfigs.at(-1);

  assert(
    facadeModuleConfig !== undefined,
    "Unreachable. Each service must have at least one module, which is a facade",
  );

  return { moduleConfigs, facadeModuleConfig };
};

type GetModuleNamesAndConfigsDefinedInServicesArg = {
  facade: ServiceModuleV0;
} & Record<string, ServiceModuleV0>;

const getModuleNamesAndConfigsDefinedInServices = (
  serviceConfigModules: GetModuleNamesAndConfigsDefinedInServicesArg,
): ModuleNameAndConfigDefinedInService[] => {
  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfigModules;

  return [
    ...Object.entries(otherModules).map(
      ([moduleName, moduleConfig]): ModuleNameAndConfigDefinedInService => {
        return {
          moduleConfig,
          moduleName,
        };
      },
    ),
    {
      moduleConfig: facadeModule,
      moduleName: FACADE_MODULE_NAME,
    },
  ];
};
