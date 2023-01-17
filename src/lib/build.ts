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
import path from "node:path";

import color from "@oclif/color";
import { CliUx } from "@oclif/core";

import type { ConfigKeyPair } from "../lib/configs/keyPair";
import type {
  FluenceConfigReadonly,
  OverrideModules,
  ServiceDeployV1,
} from "../lib/configs/project/fluence";
import {
  initReadonlyModuleConfig,
  ModuleConfigReadonly,
  MODULE_TYPE_RUST,
} from "../lib/configs/project/module";
import { initProjectSecretsConfig } from "../lib/configs/project/projectSecrets";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  ModuleV0,
  ServiceConfigReadonly,
} from "../lib/configs/project/service";
import {
  CommandObj,
  FLUENCE_CONFIG_FILE_NAME,
  MODULE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../lib/const";
import {
  downloadModule,
  downloadService,
  getModuleUrlOrAbsolutePath,
  getModuleWasmPath,
  isUrl,
  validateAquaName,
} from "../lib/helpers/downloadFile";
import { generateServiceInterface } from "../lib/helpers/generateServiceInterface";
import { getProjectKeyPair, getUserKeyPair } from "../lib/keypairs";
import type { MarineCLI } from "../lib/marineCli";
import { confirm } from "../lib/prompt";

import { generateKeyPair } from "./helpers/generateKeyPair";

type ModuleNameAndConfigDefinedInService = {
  moduleName: string;
  moduleConfig: ModuleV0;
};
type ServiceInfoWithUnresolvedModuleConfigs = Omit<
  ServiceDeployV1,
  "overrideModules" | "keyPairName"
> & {
  serviceName: string;
  serviceDirPath: string;
  moduleNamesAndConfigsDefinedInService: Array<ModuleNameAndConfigDefinedInService>;
  keyPair: ConfigKeyPair;
};

export type ServiceInfo = Omit<
  ServiceInfoWithUnresolvedModuleConfigs,
  "moduleNamesAndConfigsDefinedInService" | "serviceDirPath"
> & {
  moduleConfigs: Array<ModuleConfigReadonly & { wasmPath: string }>;
};

type ResolveServiceInfosArg = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfigReadonly;
  defaultKeyPair: ConfigKeyPair;
  isInteractive: boolean;
};

const resolveServiceInfos = async ({
  commandObj,
  fluenceConfig,
  defaultKeyPair,
  isInteractive,
}: ResolveServiceInfosArg): Promise<
  ServiceInfoWithUnresolvedModuleConfigs[]
> => {
  if (
    fluenceConfig.services === undefined ||
    Object.keys(fluenceConfig.services).length === 0
  ) {
    return commandObj.error(
      `Use ${color.yellow(
        "fluence service add"
      )} command to add services to ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}`
    );
  }

  type ServiceConfigPromises = Promise<{
    serviceName: string;
    serviceDirPath: string;
    serviceConfig: ServiceConfigReadonly;
    deploy: Array<ServiceDeployV1>;
    keyPair: ConfigKeyPair;
  }>;

  CliUx.ux.action.start("Making sure all services are downloaded");

  const projectSecretsConfig = await initProjectSecretsConfig(commandObj);

  const getKeyPair = async (
    defaultKeyPair: ConfigKeyPair,
    keyPairName: string | undefined
  ): Promise<ConfigKeyPair> => {
    if (keyPairName === undefined) {
      return defaultKeyPair;
    }

    let keyPair =
      (await getProjectKeyPair({
        commandObj,
        keyPairName,
      })) ??
      (await getUserKeyPair({
        commandObj,
        keyPairName,
      }));

    if (keyPair === undefined) {
      CliUx.ux.action.stop("paused");

      commandObj.warn(`Key pair ${color.yellow(keyPairName)} not found`);

      const doGenerate = await confirm({
        message: `Do you want to generate new key-pair ${color.yellow(
          keyPairName
        )} for your project?`,
        isInteractive,
      });

      if (!doGenerate) {
        return commandObj.error("Aborted");
      }

      CliUx.ux.action.start("Making sure all services are downloaded");

      keyPair = await generateKeyPair(keyPairName);
      projectSecretsConfig.keyPairs.push(keyPair);
      await projectSecretsConfig.$commit();
    }

    return keyPair;
  };

  const serviceConfigs = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      ([serviceName, { get, deploy, keyPairName }]): ServiceConfigPromises =>
        (async (): ServiceConfigPromises => {
          const serviceDirPath = isUrl(get)
            ? await downloadService(get)
            : path.resolve(get);

          return {
            serviceName,
            deploy,
            keyPair: await getKeyPair(defaultKeyPair, keyPairName),
            serviceDirPath,
            serviceConfig:
              (await initReadonlyServiceConfig(serviceDirPath, commandObj)) ??
              commandObj.error(
                `Service ${color.yellow(serviceName)} must have ${color.yellow(
                  SERVICE_CONFIG_FILE_NAME
                )}. ${
                  isUrl(get)
                    ? `Not able to find it after downloading and decompressing ${color.yellow(
                        get
                      )}`
                    : `Not able to find it at ${color.yellow(get)}`
                }`
              ),
          };
        })()
    )
  );

  CliUx.ux.action.stop();

  return Promise.all(
    serviceConfigs.flatMap(
      ({
        serviceName,
        deploy,
        serviceConfig,
        serviceDirPath,
        keyPair,
      }): Array<Promise<ServiceInfoWithUnresolvedModuleConfigs>> =>
        deploy.flatMap(
          async ({
            overrideModules,
            keyPairName,
            ...rest
          }): Promise<ServiceInfoWithUnresolvedModuleConfigs> => {
            const { deployId } = rest;
            const deployIdValidity = validateAquaName(deployId);

            if (deployIdValidity !== true) {
              return commandObj.error(
                `deployId ${color.yellow(deployId)} ${deployIdValidity}`
              );
            }

            return {
              serviceName,
              serviceDirPath,
              moduleNamesAndConfigsDefinedInService:
                getModuleNamesAndConfigsDefinedInServices({
                  commandObj,
                  deployId,
                  overrideModules,
                  serviceConfigModules: serviceConfig.modules,
                  serviceDirPath,
                  serviceName,
                }),
              keyPair: await getKeyPair(keyPair, keyPairName),
              ...rest,
            };
          }
        )
    )
  );
};

export type BuildArg = ResolveServiceInfosArg & {
  marineCli: MarineCLI;
};

export const build = async ({
  marineCli,
  ...resolveDeployInfosArg
}: BuildArg): Promise<Array<ServiceInfo>> => {
  const { commandObj } = resolveDeployInfosArg;

  const serviceInfos = await resolveServiceInfos(resolveDeployInfosArg);

  const setOfAllModuleGets = [
    ...new Set(
      serviceInfos.flatMap(
        ({
          moduleNamesAndConfigsDefinedInService: modules,
          serviceDirPath,
        }): Array<string> =>
          modules.map(({ moduleConfig: { get } }): string =>
            getModuleUrlOrAbsolutePath(get, serviceDirPath)
          )
      )
    ),
  ];

  CliUx.ux.action.start("Making sure all modules are downloaded and built");

  const mapOfModuleConfigs = new Map(
    await Promise.all(
      setOfAllModuleGets.map(
        (get): Promise<[string, ModuleConfigReadonly]> =>
          (async (): Promise<[string, ModuleConfigReadonly]> => {
            const moduleConfig = isUrl(get)
              ? await initReadonlyModuleConfig(
                  await downloadModule(get),
                  commandObj
                )
              : await initReadonlyModuleConfig(get, commandObj);

            if (moduleConfig === null) {
              CliUx.ux.action.stop(color.red("error"));

              return commandObj.error(
                `Module with get: ${color.yellow(
                  get
                )} doesn't have ${color.yellow(MODULE_CONFIG_FILE_NAME)}`
              );
            }

            if (moduleConfig.type === MODULE_TYPE_RUST) {
              await marineCli({
                args: ["build"],
                flags: { release: true },
                cwd: path.dirname(moduleConfig.$getPath()),
              });
            }

            return [get, moduleConfig];
          })()
      )
    )
  );

  CliUx.ux.action.stop();

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
            getModuleUrlOrAbsolutePath(get, serviceDirPath)
          );

          if (moduleConfig === undefined) {
            throw new Error(
              `Unreachable. Wasn't able to find module config for ${get}`
            );
          }

          const overriddenModuleConfig = { ...moduleConfig, ...overrides };

          return {
            ...overriddenModuleConfig,
            wasmPath: getModuleWasmPath(overriddenModuleConfig),
          };
        }
      );

      const facadeModuleConfig = moduleConfigs.at(-1);

      assert(
        facadeModuleConfig !== undefined,
        "Unreachable. Each service must have at least one module"
      );

      serviceNamePathToFacadeMap[rest.serviceName] =
        facadeModuleConfig.wasmPath;

      return {
        moduleConfigs,
        ...rest,
      };
    }
  );

  // generate interfaces for all services
  await Promise.all(
    Object.entries(serviceNamePathToFacadeMap).map(
      ([serviceName, pathToFacadeWasm]): Promise<void> =>
        generateServiceInterface({
          pathToFacadeWasm,
          marineCli,
          serviceName,
        })
    )
  );

  return serviceInfoWithModuleConfigs;
};

const overrideModule = (
  mod: ModuleV0,
  overrideModules: OverrideModules | undefined,
  moduleName: string
): ModuleV0 => ({ ...mod, ...overrideModules?.[moduleName] });

type GetModuleNamesAndConfigsDefinedInServicesArg = {
  commandObj: CommandObj;
  overrideModules: OverrideModules | undefined;
  serviceName: string;
  deployId: string;
  serviceDirPath: string;
  serviceConfigModules: { facade: ModuleV0 } & Record<string, ModuleV0>;
};

const getModuleNamesAndConfigsDefinedInServices = ({
  commandObj,
  overrideModules,
  serviceName,
  deployId,
  serviceDirPath,
  serviceConfigModules,
}: GetModuleNamesAndConfigsDefinedInServicesArg): ModuleNameAndConfigDefinedInService[] => {
  const modulesNotFoundInServiceYaml = Object.keys(
    overrideModules ?? {}
  ).filter((moduleName): boolean => !(moduleName in serviceConfigModules));

  if (modulesNotFoundInServiceYaml.length > 0) {
    commandObj.error(
      `${color.yellow(FLUENCE_CONFIG_FILE_NAME)} has service ${color.yellow(
        serviceName
      )} with deployId ${color.yellow(
        deployId
      )} that has moduleOverrides for modules that don't exist in the service ${color.yellow(
        serviceDirPath
      )}. Please make sure ${color.yellow(
        modulesNotFoundInServiceYaml.join(", ")
      )} spelled correctly `
    );
  }

  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfigModules;

  return [
    ...Object.entries(otherModules).map(
      ([moduleName, mod]): ModuleNameAndConfigDefinedInService => ({
        moduleConfig: overrideModule(mod, overrideModules, moduleName),
        moduleName,
      })
    ),
    {
      moduleConfig: overrideModule(
        facadeModule,
        overrideModules,
        FACADE_MODULE_NAME
      ),
      moduleName: FACADE_MODULE_NAME,
    },
  ];
};
