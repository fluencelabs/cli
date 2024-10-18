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
import { overrideModule } from "./deployWorkers.js";
import { updateAquaServiceInterfaceFile } from "./helpers/generateServiceInterface.js";
import { genServiceConfigToml } from "./helpers/serviceConfigToml.js";
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

  const services = Object.entries(fluenceConfig.services ?? []);

  const hasSomeServiceURL = services.some(([, { get }]) => {
    return isUrl(get);
  });

  if (hasSomeServiceURL) {
    startSpinner("Making sure all services are downloaded");
  }

  const serviceConfigs = await Promise.all(
    services.map(async ([serviceName, { get }]): ServiceConfigPromises => {
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
    }),
  );

  if (hasSomeServiceURL) {
    stopSpinner();
  }

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

export async function build({
  marineCli,
  marineBuildArgs,
  ...resolveDeployInfosArg
}: BuildArg): Promise<Array<ServiceInfo>> {
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
}

async function resolveSingleServiceModuleConfigs(
  serviceConfig: ServiceConfigReadonly,
  overridesFromFluenceYAMLMap: OverrideModules | undefined,
) {
  const { [FACADE_MODULE_NAME]: facadeModule, ...restModules } =
    serviceConfig.modules;

  const serviceConfigDirPath = serviceConfig.$getDirPath();

  const allModuleConfigs = await Promise.all([
    overrideModuleConfig(
      FACADE_MODULE_NAME,
      facadeModule,
      overridesFromFluenceYAMLMap,
      serviceConfigDirPath,
    ),
    ...Object.entries(restModules).map(async ([name, moduleConfig]) => {
      return overrideModuleConfig(
        name,
        moduleConfig,
        overridesFromFluenceYAMLMap,
        serviceConfigDirPath,
      );
    }),
  ]);

  const [facadeModuleConfig, ...restModuleConfigs] = allModuleConfigs;

  return {
    facadeModuleConfig,
    allModuleConfigs: [...restModuleConfigs, facadeModuleConfig],
  };
}

async function overrideModuleConfig(
  name: string,
  { get, ...overridesFromServiceYAML }: ServiceModuleV0,
  overridesFromFluenceYAMLMap: OverrideModules | undefined,
  serviceConfigDirPath: string,
) {
  const overridesFromFluenceYAML = overridesFromFluenceYAMLMap?.[name];

  const moduleConfig = await initReadonlyModuleConfig(
    get,
    serviceConfigDirPath,
  );

  if (moduleConfig === null) {
    return commandObj.error(`Cant find module config at ${color.yellow(get)}`);
  }

  return overrideModule(
    moduleConfig,
    overridesFromServiceYAML,
    overridesFromFluenceYAML,
  );
}

type ResolveSingleServiceModuleConfigsAndBuildArgs = {
  serviceName: string;
  serviceConfig: ServiceConfigReadonly;
  fluenceConfig: FluenceConfigReadonly | undefined | null;
  marineCli: MarineCLI;
  marineBuildArgs: string | undefined;
};

export async function resolveSingleServiceModuleConfigsAndBuild({
  serviceName,
  serviceConfig,
  fluenceConfig,
  marineCli,
  marineBuildArgs,
}: ResolveSingleServiceModuleConfigsAndBuildArgs) {
  const maybeOverridesFromFluenceCOnfig =
    fluenceConfig?.services?.[serviceConfig.name]?.overrideModules;

  const { facadeModuleConfig, allModuleConfigs } =
    await resolveSingleServiceModuleConfigs(
      serviceConfig,
      maybeOverridesFromFluenceCOnfig,
    );

  await buildModules(
    allModuleConfigs,
    marineCli,
    marineBuildArgs,
    fluenceConfig,
  );

  const fluenceServiceConfigTomlPath = await genServiceConfigToml(
    serviceName,
    serviceConfig,
    fluenceConfig?.services?.[serviceName],
    allModuleConfigs,
  );

  return { facadeModuleConfig, fluenceServiceConfigTomlPath };
}

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
