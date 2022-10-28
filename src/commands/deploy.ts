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
import { yamlDiffPatch } from "yaml-diff-patch";

import { AquaCLI, initAquaCli } from "../lib/aquaCli";
import {
  DeployedServiceConfig,
  initAppConfig,
  initNewReadonlyAppConfig,
  ServicesV3,
} from "../lib/configs/project/app";
import {
  Distribution,
  DISTRIBUTION_EVEN,
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
  AQUA_EXT,
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FORCE_FLAG_NAME,
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  KEY_PAIR_FLAG_NAME,
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
import {
  ConfigKeyPair,
  generateKeyPair,
  getExistingKeyPair,
  getProjectKeyPair,
  getUserKeyPair,
} from "../lib/keypairs";
import { initMarineCli, MarineCLI } from "../lib/marineCli";
import {
  getEvenlyDistributedIds,
  getEvenlyDistributedIdsFromTheList,
  getRandomRelayAddr,
  getRandomRelayId,
  getRandomRelayIdFromTheList,
  Relays,
} from "../lib/multiaddr";
import {
  ensureFluenceAquaServicesDir,
  ensureFluenceTmpDeployJsonPath,
} from "../lib/paths";
import { confirm } from "../lib/prompt";
import { hasKey } from "../lib/typeHelpers";

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
    const fluenceConfig = await ensureFluenceProject(this, isInteractive);

    const defaultKeyPair = await getExistingKeyPair({
      keyPairName: flags[KEY_PAIR_FLAG_NAME] ?? fluenceConfig.keyPairName,
      commandObj: this,
      isInteractive,
    });

    if (defaultKeyPair instanceof Error) {
      this.error(defaultKeyPair.message);
    }

    const relay = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);

    const marineCli = await initMarineCli(this, fluenceConfig);

    const preparedForDeployItems = await prepareForDeploy({
      commandObj: this,
      fluenceConfig,
      defaultKeyPair,
      isInteractive,
      marineCli,
    });

    const aquaCli = await initAquaCli(this, fluenceConfig);
    const tmpDeployJSONPath = await ensureFluenceTmpDeployJsonPath();
    let appConfig = await initAppConfig(this);

    if (
      appConfig !== null &&
      Object.keys(appConfig.services).length > 0 &&
      (isInteractive
        ? await confirm({
            isInteractive,
            message:
              "Do you want to select previously deployed services that you want to remove?",
          })
        : true)
    ) {
      appConfig = await removeApp({
        appConfig,
        commandObj: this,
        isInteractive,
        timeout: flags[TIMEOUT_FLAG_NAME],
        aquaCli,
      });
    }

    const allServices: ServicesV3 = appConfig?.services ?? {};
    const serviceNamePathToFacadeMap: Record<string, string> = {};

    this.log(
      `\nGoing to deploy services described in ${color.yellow(
        replaceHomeDir(fluenceConfig.$getPath())
      )}:\n\n${yamlDiffPatch("", {}, fluenceConfig.services)}\n`
    );

    const doDeployAll = isInteractive
      ? await confirm({
          isInteractive,
          message: "Do you want to deploy all of these services?",
        })
      : true;

    for (const {
      deployJSON,
      deployId,
      peerId,
      serviceName,
      keyPair,
      facadeModuleWasmPath,
    } of preparedForDeployItems) {
      // Here we don't deploy in parallel because it often fails if run in parallel
      // And also when user requests, we interactively ask about each deploy
      // eslint-disable-next-line no-await-in-loop
      const res = await deployService({
        deployJSON,
        peerId,
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
          { ...deployedServiceConfig, keyPairName: keyPair.name },
        ];

        allServices[serviceName] = successfullyDeployedServicesByName;
        serviceNamePathToFacadeMap[serviceName] = facadeModuleWasmPath;
      }
    }

    if (Object.keys(allServices).length === 0) {
      return;
    }

    // remove previously generated interfaces for services
    const aquaServicesDirPath = await ensureFluenceAquaServicesDir();

    const servicesDirContent = await fsPromises.readdir(aquaServicesDirPath);

    await Promise.all(
      servicesDirContent
        .filter(
          (fileName): boolean =>
            !(fileName.slice(0, 1 + AQUA_EXT.length) in allServices)
        )
        .map(
          (fileName): Promise<void> =>
            fsPromises.unlink(path.join(aquaServicesDirPath, fileName))
        )
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

    await generateDeployedAppAqua(allServices);

    await generateRegisterApp({
      deployedServices: allServices,
      aquaCli,
      fluenceConfig,
    });

    const logResults = (configPath: string): void => {
      this.log(
        `\nCurrently deployed services listed in ${color.yellow(
          replaceHomeDir(configPath ?? "")
        )}:\n\n${yamlDiffPatch("", {}, allServices)}\n`
      );
    };

    if (appConfig !== null) {
      appConfig.services = allServices;
      await appConfig.$commit();
      return logResults(appConfig.$getPath());
    }

    const newAppConfig = await initNewReadonlyAppConfig(
      {
        version: 3,
        services: allServices,
        timestamp: new Date().toISOString(),
        relays: fluenceConfig.relays,
      },
      this
    );

    logResults(newAppConfig.$getPath());
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
  peerId: string;
  modules: Array<DeployInfoModule>;
  keyPair: ConfigKeyPair;
};

const overrideModule = (
  mod: ModuleV0,
  overrideModules: OverrideModules | undefined,
  moduleName: string
): ModuleV0 => ({ ...mod, ...overrideModules?.[moduleName] });

type PreparedForDeploy = Omit<DeployInfo, "modules" | "serviceDirPath"> & {
  deployJSON: DeployJSONConfig;
  facadeModuleWasmPath: string;
};

type PrepareForDeployArg = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfigReadonly;
  defaultKeyPair: ConfigKeyPair;
  isInteractive: boolean;
  marineCli: MarineCLI;
};

const prepareForDeploy = async ({
  commandObj,
  fluenceConfig,
  defaultKeyPair,
  isInteractive,
  marineCli,
}: PrepareForDeployArg): Promise<Array<PreparedForDeploy>> => {
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

  const servicePaths = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      ([serviceName, { get, deploy, keyPairName }]): ServicePathPromises =>
        (async (): ServicePathPromises => ({
          serviceName,
          deploy,
          get,
          keyPair: await getKeyPair(defaultKeyPair, keyPairName),
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
    keyPair: ConfigKeyPair;
  }>;

  const serviceConfigs = await Promise.all(
    servicePaths.map(
      ({
        serviceName,
        serviceDirPath,
        deploy,
        get,
        keyPair,
      }): ServiceConfigPromises =>
        (async (): ServiceConfigPromises => ({
          serviceName,
          deploy,
          keyPair,
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

  const allDeployInfos = await Promise.all(
    serviceConfigs.flatMap(
      ({
        serviceName,
        deploy,
        serviceConfig,
        serviceDirPath,
        keyPair,
      }): Array<Promise<DeployInfo>> =>
        deploy.flatMap(
          ({
            deployId,
            count,
            peerId,
            peerIds,
            overrideModules,
            distribution,
            keyPairName,
          }): Array<Promise<DeployInfo>> => {
            const deployIdValidity = validateAquaName(deployId);

            if (deployIdValidity !== true) {
              return commandObj.error(
                `deployId ${color.yellow(deployId)} ${deployIdValidity}`
              );
            }

            return getPeerIds({
              peerId: peerIds ?? peerId,
              distribution,
              count,
              relays: fluenceConfig.relays,
              namedPeerIds: fluenceConfig.peerIds,
            }).map(
              (peerId: string): Promise<DeployInfo> =>
                (async (): Promise<DeployInfo> => ({
                  serviceName,
                  serviceDirPath,
                  deployId,
                  peerId:
                    typeof peerId === "string"
                      ? fluenceConfig?.peerIds?.[peerId ?? ""] ?? peerId
                      : peerId,
                  modules: getDeployInfoModules({
                    commandObj,
                    deployId,
                    overrideModules,
                    serviceConfigModules: serviceConfig.modules,
                    serviceDirPath,
                    serviceName,
                  }),
                  keyPair: await getKeyPair(keyPair, keyPairName),
                }))()
            );
          }
        )
    )
  );

  const setOfAllGets = [
    ...new Set(
      allDeployInfos.flatMap(
        ({ modules, serviceDirPath }): Array<string> =>
          modules.map(({ moduleConfig: { get } }): string =>
            getModuleUrlOrAbsolutePath(get, serviceDirPath)
          )
      )
    ),
  ];

  CliUx.ux.action.start("Making sure all modules are downloaded and built");

  const mapOfAllModuleConfigs = new Map(
    await Promise.all(
      setOfAllGets.map(
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

  return allDeployInfos.map(
    ({ modules, serviceDirPath, ...rest }): PreparedForDeploy => {
      const moduleConfigs = modules.map(
        ({
          moduleConfig: { get, ...overrides },
        }): ModuleConfigReadonly & { wasmPath: string } => {
          const moduleConfig = mapOfAllModuleConfigs.get(
            getModuleUrlOrAbsolutePath(get, serviceDirPath)
          );

          if (moduleConfig === undefined) {
            return commandObj.error(
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

      const deployJSON = {
        [DEFAULT_DEPLOY_NAME]: {
          modules: moduleConfigs.map(
            (moduleConfig): JSONModuleConf =>
              serviceModuleToJSONModuleConfig(moduleConfig)
          ),
        },
      };

      const facadeModuleConfig = moduleConfigs[moduleConfigs.length - 1];

      if (facadeModuleConfig === undefined) {
        return commandObj.error(
          "Unreachable. Each service must have at least one module"
        );
      }

      return {
        ...rest,
        deployJSON,
        facadeModuleWasmPath: facadeModuleConfig.wasmPath,
      };
    }
  );
};

type GetPeerIdsArg = {
  peerId: undefined | string | Array<string>;
  distribution: Distribution | undefined;
  count: number | undefined;
  relays: Relays;
  namedPeerIds: Record<string, string> | undefined;
};

const getNamedPeerIdsFn =
  (
    namedPeerIds: Record<string, string>
  ): ((peerIds: Array<string>) => string[]) =>
  (peerIds: Array<string>): string[] =>
    peerIds.map((peerId): string => namedPeerIds[peerId] ?? peerId);

const getPeerIds = ({
  peerId,
  distribution = DISTRIBUTION_EVEN,
  count,
  relays,
  namedPeerIds = {},
}: GetPeerIdsArg): Array<string> => {
  const getNamedPeerIds = getNamedPeerIdsFn(namedPeerIds);

  if (distribution === DISTRIBUTION_EVEN) {
    if (peerId === undefined) {
      return getEvenlyDistributedIds(relays, count);
    }

    return getEvenlyDistributedIdsFromTheList(
      getNamedPeerIds(typeof peerId === "string" ? [peerId] : peerId),
      count
    );
  }

  if (peerId === undefined) {
    return Array.from({ length: count ?? 1 }).map((): string =>
      getRandomRelayId(relays)
    );
  }

  const peerIds = typeof peerId === "string" ? [peerId] : peerId;
  return Array.from({ length: count ?? peerIds.length }).map((): string =>
    getRandomRelayIdFromTheList(peerIds)
  );
};

type GetDeployInfoModulesArg = {
  commandObj: CommandObj;
  overrideModules: OverrideModules | undefined;
  serviceName: string;
  deployId: string;
  serviceDirPath: string;
  serviceConfigModules: { facade: ModuleV0 } & Record<string, ModuleV0>;
};

const getDeployInfoModules = ({
  commandObj,
  overrideModules,
  serviceName,
  deployId,
  serviceDirPath,
  serviceConfigModules,
}: GetDeployInfoModulesArg): Array<DeployInfoModule> => {
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
      ([moduleName, mod]): DeployInfoModule => ({
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
  moduleConfig: ModuleConfigReadonly & { wasmPath: string }
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
    wasmPath,
  } = moduleConfig;

  const jsonModuleConfig: JSONModuleConf = {
    name,
    path: wasmPath,
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
 * Deploy each service using `aqua remote deploy_service`
 * @param param0 Everything that's needed to deploy a service
 * @returns Promise of deployed service config with service name and id
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
        args: ["remote", "deploy_service"],
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

  const firstBraceIndex = [...result].reverse().indexOf("{");
  const parsedResult: unknown = JSON.parse(result.slice(-firstBraceIndex - 1));

  if (
    !(
      hasKey("blueprint_id", parsedResult) &&
      typeof parsedResult.blueprint_id === "string"
    ) ||
    !(
      hasKey("service_id", parsedResult) &&
      typeof parsedResult.service_id === "string"
    )
  ) {
    commandObj.warn(
      `Deployment finished without errors but not able to parse serviceId or blueprintId from aqua cli output:\n\n${result}`
    );

    return null;
  }

  return {
    deployedServiceConfig: {
      blueprintId: parsedResult.blueprint_id,
      serviceId: parsedResult.service_id,
      peerId,
    },
    serviceName,
    deployId,
  };
};
