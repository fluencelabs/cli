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

import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";
import { CliUx, Command, Flags } from "@oclif/core";

import { AquaCLI, initAquaCli } from "../lib/aquaCli";
import {
  DeployedServiceConfig,
  initAppConfig,
  initNewReadonlyAppConfig,
  ServicesV2,
} from "../lib/configs/project/app";
import {
  FluenceConfigReadonly,
  initReadonlyFluenceConfig,
  OverrideModules,
  ServiceDeployV1,
} from "../lib/configs/project/fluence";
import {
  initReadonlyModuleConfig,
  ModuleConfigReadonly,
} from "../lib/configs/project/module";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  ModuleV0,
  ServiceConfigReadonly,
} from "../lib/configs/project/service";
import {
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FORCE_FLAG_NAME,
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  MODULE_CONFIG_FILE_NAME,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
  TIMEOUT_FLAG,
  TIMEOUT_FLAG_NAME,
} from "../lib/const";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp";
import {
  downloadModule,
  downloadService,
  getModuleUrlOrAbsolutePath,
  getModuleWasmPath,
  isUrl,
  validateAquaName,
} from "../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../lib/helpers/ensureFluenceProject";
import { generateServiceInterface } from "../lib/helpers/generateServiceInterface";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import { getKeyPairFromFlags } from "../lib/keypairs";
import { initMarineCli } from "../lib/marineCli";
import { getRandomRelayAddr, getRandomRelayId } from "../lib/multiaddr";
import {
  ensureFluenceAquaServicesDir,
  ensureFluenceTmpDeployJsonPath,
} from "../lib/paths";
import { confirm } from "../lib/prompt";

import { removeApp } from "./remove";

export default class Deploy extends Command {
  static override description = `Deploy application, described in ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    relay: Flags.string({
      description: "Relay node multiaddr",
      helpValue: "<multiaddr>",
    }),
    [FORCE_FLAG_NAME]: Flags.boolean({
      description: "Force removing of previously deployed app",
    }),
    ...TIMEOUT_FLAG,
    ...KEY_PAIR_FLAG,
    ...NO_INPUT_FLAG,
  };
  async run(): Promise<void> {
    const { flags } = await this.parse(Deploy);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    const keyPair = await getKeyPairFromFlags(flags, this, isInteractive);

    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }

    const fluenceConfig = await initReadonlyFluenceConfig(this);

    if (fluenceConfig === null) {
      this.error("You must init Fluence project first to deploy");
    }

    const relay = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);

    const preparedForDeployItems = await prepareForDeploy({
      commandObj: this,
      fluenceConfig,
    });

    const aquaCli = await initAquaCli(this);
    const tmpDeployJSONPath = await ensureFluenceTmpDeployJsonPath();
    let appConfig = await initAppConfig(this);

    if (
      appConfig !== null &&
      (isInteractive
        ? await confirm({
            isInteractive,
            message:
              "Do you want to remove some of the previously deployed services?",
          })
        : true)
    ) {
      const addr = relay ?? getRandomRelayAddr(appConfig.relays);

      appConfig = await removeApp({
        appConfig,
        relay: addr,
        commandObj: this,
        isInteractive,
        timeout: flags[TIMEOUT_FLAG_NAME],
        aquaCli,
      });
    }

    const allServices: ServicesV2 = appConfig?.services ?? {};

    this.log(
      `Going to deploy project described in ${color.yellow(
        replaceHomeDir(fluenceConfig.$getPath())
      )}`
    );

    const doDeployAll = isInteractive
      ? await confirm({
          isInteractive,
          message: `Do you want to deploy all of the services from ${color.yellow(
            FLUENCE_CONFIG_FILE_NAME
          )}?`,
        })
      : true;

    for (const {
      count,
      deployJSON,
      deployId,
      peerId,
      serviceName,
    } of preparedForDeployItems) {
      for (let i = 0; i < count; i = i + 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await deployService({
          deployJSON,
          peerId: peerId ?? getRandomRelayId(fluenceConfig.relays),
          serviceName,
          deployId,
          relay,
          secretKey: keyPair.secretKey,
          aquaCli,
          timeout: flags[TIMEOUT_FLAG_NAME],
          tmpDeployJSONPath,
          commandObj: this,
          doDeployAll,
          isInteractive,
        });

        if (res !== null) {
          const { deployedServiceConfig, deployId, serviceName } = res;

          const successfullyDeployedServicesByName =
            allServices[serviceName] ?? {};

          successfullyDeployedServicesByName[deployId] = [
            ...(successfullyDeployedServicesByName[deployId] ?? []),
            deployedServiceConfig,
          ];

          allServices[serviceName] = successfullyDeployedServicesByName;
        }
      }
    }

    if (Object.keys(allServices).length === 0) {
      this.error("No services were deployed successfully");
    }

    await generateDeployedAppAqua(allServices);

    await generateRegisterApp({
      deployedServices: allServices,
      aquaCli,
    });

    if (appConfig !== null) {
      appConfig.services = allServices;
      return appConfig.$commit();
    }

    await initNewReadonlyAppConfig(
      {
        version: 2,
        services: allServices,
        keyPairName: keyPair.name,
        timestamp: new Date().toISOString(),
        relays: fluenceConfig.relays,
      },
      this
    );
  }
}

type DeployInfoModule = {
  moduleName: string;
  moduleConfig: ModuleV0;
};

type DeployInfo = {
  serviceName: string;
  serviceDirPath: string;
  deployId: string;
  count: number;
  peerId: string | undefined;
  modules: Array<DeployInfoModule>;
};

const overrideModule = (
  mod: ModuleV0,
  overrideModules: OverrideModules | undefined,
  moduleName: string
): ModuleV0 => ({ ...mod, ...overrideModules?.[moduleName] });

type PreparedForDeploy = Omit<DeployInfo, "modules" | "serviceDirPath"> & {
  deployJSON: DeployJSONConfig;
};

type GetDeployJSONsArg = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfigReadonly;
};

const prepareForDeploy = async ({
  commandObj,
  fluenceConfig,
}: GetDeployJSONsArg): Promise<Array<PreparedForDeploy>> => {
  if (
    fluenceConfig.services === undefined ||
    Object.keys(fluenceConfig.services).length === 0
  ) {
    throw new Error(
      `Use ${color.yellow(
        "fluence service add"
      )} command to add services you want to deploy to ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}`
    );
  }

  type ServicePathPromises = Promise<{
    serviceName: string;
    serviceDirPath: string;
    get: string;
    deploy: Array<ServiceDeployV1>;
  }>;

  CliUx.ux.action.start("Making sure all services are downloaded");

  const servicePaths = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      ([serviceName, { get, deploy }]): ServicePathPromises =>
        (async (): ServicePathPromises => ({
          serviceName,
          deploy,
          get,
          serviceDirPath: isUrl(get)
            ? await downloadService(get)
            : path.resolve(get),
        }))()
    )
  );

  CliUx.ux.action.stop();

  type ServiceConfigPromises = Promise<{
    serviceName: string;
    serviceConfig: ServiceConfigReadonly;
    serviceDirPath: string;
    deploy: Array<ServiceDeployV1>;
  }>;

  const serviceConfigs = await Promise.all(
    servicePaths.map(
      ({ serviceName, serviceDirPath, deploy, get }): ServiceConfigPromises =>
        (async (): ServiceConfigPromises => ({
          serviceName,
          deploy,
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
          serviceDirPath,
        }))()
    )
  );

  const allDeployInfos = serviceConfigs.flatMap(
    ({
      serviceName,
      deploy,
      serviceConfig,
      serviceDirPath,
    }): Array<DeployInfo> =>
      deploy.map(
        ({ deployId, count = 1, peerId, overrideModules }): DeployInfo => {
          const deployIdValidity = validateAquaName(deployId);

          if (deployIdValidity !== true) {
            return commandObj.error(
              `deployId ${color.yellow(deployId)} ${deployIdValidity}`
            );
          }

          return {
            serviceName,
            serviceDirPath,
            deployId,
            count,
            peerId: fluenceConfig?.peerIds?.[peerId ?? ""] ?? peerId,
            modules: ((): Array<DeployInfoModule> => {
              const modulesNotFoundInServiceYaml = Object.keys(
                overrideModules ?? {}
              ).filter(
                (moduleName): boolean => !(moduleName in serviceConfig.modules)
              );

              if (modulesNotFoundInServiceYaml.length > 0) {
                commandObj.error(
                  `${color.yellow(
                    FLUENCE_CONFIG_FILE_NAME
                  )} has service ${color.yellow(
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
                serviceConfig.modules;

              return [
                ...Object.entries(otherModules).map(
                  ([moduleName, mod]): DeployInfoModule => ({
                    moduleConfig: overrideModule(
                      mod,
                      overrideModules,
                      moduleName
                    ),
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
            })(),
          };
        }
      )
  );

  const setOfAllGets = [
    ...new Set(
      allDeployInfos.flatMap(
        ({
          modules,
          serviceDirPath,
          serviceName,
        }): Array<{ get: string; moduleName: string; serviceName: string }> =>
          modules.map(
            ({
              moduleConfig: { get },
              moduleName,
            }): { get: string; moduleName: string; serviceName: string } => ({
              get: getModuleUrlOrAbsolutePath(get, serviceDirPath),
              moduleName,
              serviceName,
            })
          )
      )
    ),
  ];

  const marineCli = await initMarineCli(commandObj);

  await fsPromises.rm(await ensureFluenceAquaServicesDir(), {
    recursive: true,
    force: true,
  });

  CliUx.ux.action.start("Making sure all modules are downloaded and built");

  const mapOfAllModuleConfigs = new Map(
    await Promise.all(
      setOfAllGets.map(
        ({
          get,
          moduleName,
          serviceName,
        }): Promise<[string, ModuleConfigReadonly]> =>
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

            if (moduleConfig.type === "rust") {
              await marineCli({
                command: "build",
                flags: { release: true },
                workingDir: path.dirname(moduleConfig.$getPath()),
              });
            }

            if (moduleName === FACADE_MODULE_NAME) {
              await generateServiceInterface({
                pathToFacade: getModuleWasmPath(moduleConfig),
                marineCli,
                serviceName,
              });
            }

            return [get, moduleConfig];
          })()
      )
    )
  );

  CliUx.ux.action.stop();

  return allDeployInfos.map(
    ({ modules, serviceDirPath, ...rest }): PreparedForDeploy => {
      const deployJSON = {
        [DEFAULT_DEPLOY_NAME]: {
          modules: modules.map(
            ({ moduleConfig: { get, ...overrides } }): JSONModuleConf => {
              const moduleConfig = mapOfAllModuleConfigs.get(
                getModuleUrlOrAbsolutePath(get, serviceDirPath)
              );

              if (moduleConfig === undefined) {
                return commandObj.error(
                  `Unreachable. Wasn't able to find module config for ${get}`
                );
              }

              return serviceModuleToJSONModuleConfig(moduleConfig, overrides);
            }
          ),
        },
      };

      return {
        ...rest,
        deployJSON,
      };
    }
  );
};

/* eslint-disable camelcase */
type JSONModuleConf = {
  name: string;
  path: string;
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  mapped_dirs?: Array<[string, string]>;
  preopened_files?: Array<string>;
  envs?: Array<[string, string]>;
  mounted_binaries?: Array<[string, string]>;
};

type DeployJSONConfig = Record<
  string,
  {
    modules: Array<JSONModuleConf>;
  }
>;

const serviceModuleToJSONModuleConfig = (
  moduleConfig: ModuleConfigReadonly,
  overrides: Omit<ModuleV0, "get">
): JSONModuleConf => {
  const overriddenConfig = { ...moduleConfig, ...overrides };

  const {
    name,
    loggerEnabled,
    loggingMask,
    volumes,
    envs,
    maxHeapSize,
    mountedBinaries,
    preopenedFiles,
  } = overriddenConfig;

  const jsonModuleConfig: JSONModuleConf = {
    name,
    path: getModuleWasmPath(overriddenConfig),
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

type DeployServiceArg = Readonly<{
  deployJSON: DeployJSONConfig;
  relay: string;
  secretKey: string;
  aquaCli: AquaCLI;
  timeout: number | undefined;
  serviceName: string;
  deployId: string;
  tmpDeployJSONPath: string;
  commandObj: CommandObj;
  doDeployAll: boolean;
  isInteractive: boolean;
}>;

/**
 * Deploy by first uploading .wasm files and configs, possibly creating a new blueprint
 * @param param0 DeployServiceOptions
 * @returns Promise<DeployedServiceConfig | null>
 */
const deployService = async ({
  deployJSON,
  peerId,
  serviceName,
  deployId,
  relay,
  secretKey,
  aquaCli,
  tmpDeployJSONPath,
  timeout,
  commandObj,
  doDeployAll,
  isInteractive,
}: DeployServiceArg & { peerId: string }): Promise<{
  deployedServiceConfig: DeployedServiceConfig;
  serviceName: string;
  deployId: string;
} | null> => {
  const keyValuePairs = { service: serviceName, deployId, on: peerId };

  if (
    !doDeployAll &&
    !(await confirm({
      isInteractive,
      message: getMessageWithKeyValuePairs(
        "Do you want to deploy",
        keyValuePairs
      ),
    }))
  ) {
    return null;
  }

  await fsPromises.writeFile(
    tmpDeployJSONPath,
    JSON.stringify(deployJSON, null, 2),
    FS_OPTIONS
  );

  let result: string;

  try {
    result = await aquaCli(
      {
        command: "remote deploy_service",
        flags: {
          "config-path": tmpDeployJSONPath,
          service: DEFAULT_DEPLOY_NAME,
          addr: relay,
          sk: secretKey,
          on: peerId,
          timeout,
        },
      },
      "Deploying",
      keyValuePairs
    );
  } catch (error) {
    commandObj.warn(`Wasn't able to deploy service\n${String(error)}`);
    return null;
  }

  const [, blueprintId] = /Blueprint id:\n(.*)/.exec(result) ?? [];
  const [, serviceId] = /And your service id is:\n"(.*)"/.exec(result) ?? [];

  if (blueprintId === undefined || serviceId === undefined) {
    commandObj.warn(
      `Deployment finished without errors but not able to parse serviceId or blueprintId from aqua cli output:\n\n${result}`
    );

    return null;
  }

  return {
    deployedServiceConfig: { blueprintId, serviceId, peerId },
    serviceName,
    deployId,
  };
};
