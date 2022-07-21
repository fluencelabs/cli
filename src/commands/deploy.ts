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
import camelcase from "camelcase";
import decompress from "decompress";

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
  WASM_EXT,
} from "../lib/const";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp";
import { downloadFile, stringToServiceName } from "../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../lib/helpers/ensureFluenceProject";
import { getHashOfString } from "../lib/helpers/getHashOfString";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import { usage } from "../lib/helpers/usage";
import { isUrl } from "../lib/helpers/validations";
import { getKeyPairFromFlags } from "../lib/keypairs";
import { getRandomRelayAddr, getRandomRelayId } from "../lib/multiaddr";
import {
  ensureFluenceModulesDir,
  ensureFluenceServicesDir,
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
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { flags } = await this.parse(Deploy);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);
    const appConfig = await initAppConfig(this);
    if (appConfig !== null) {
      // Prompt user to remove previously deployed app if
      // it was already deployed before
      const doRemove =
        flags[FORCE_FLAG_NAME] ||
        (await confirm({
          message: `Previously deployed app described in ${color.yellow(
            replaceHomeDir(appConfig.$getPath())
          )} needs to be removed to continue. Do you want to remove?`,
          isInteractive,
          flagName: FORCE_FLAG_NAME,
        }));

      if (!doRemove) {
        this.error("You have to confirm to continue");
      }

      await removeApp({
        appConfig,
        commandObj: this,
        timeout: flags.timeout,
        relay: flags.relay,
        isInteractive,
      });
    }

    const keyPair = await getKeyPairFromFlags(flags, this, isInteractive);
    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }
    const fluenceConfig = await initReadonlyFluenceConfig(this);
    const relay = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);
    const preparedForDeployItems = await prepareForDeploy({
      commandObj: this,
      fluenceConfig,
    });
    this.log(
      `Going to deploy project described in ${color.yellow(
        replaceHomeDir(fluenceConfig.$getPath())
      )}`
    );
    const aquaCli = await initAquaCli(this);
    const tmpDeployJSONPath = await ensureFluenceTmpDeployJsonPath();
    const successfullyDeployedServices: ServicesV2 = {};
    for (const {
      count,
      deployJSON,
      deployName,
      peerId = getRandomRelayId(fluenceConfig.relays),
      serviceName,
    } of preparedForDeployItems) {
      for (let i = 0; i < count; i = i + 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await deployService({
          deployJSON,
          peerId,
          serviceName,
          deployName,
          relay,
          secretKey: keyPair.secretKey,
          aquaCli,
          timeout: flags[TIMEOUT_FLAG_NAME],
          tmpDeployJSONPath,
          commandObj: this,
        });
        if (res !== null) {
          const { deployedServiceConfig, deployName, serviceName } = res;
          const successfullyDeployedServicesByName =
            successfullyDeployedServices[serviceName] ?? {};
          successfullyDeployedServicesByName[deployName] = [
            ...(successfullyDeployedServicesByName[deployName] ?? []),
            deployedServiceConfig,
          ];
          successfullyDeployedServices[serviceName] =
            successfullyDeployedServicesByName;
        }
      }
    }
    if (Object.keys(successfullyDeployedServices).length === 0) {
      this.error("No services were deployed successfully");
    }
    await generateDeployedAppAqua(successfullyDeployedServices);
    await generateRegisterApp({
      deployedServices: successfullyDeployedServices,
      aquaCli,
    });

    await initNewReadonlyAppConfig(
      {
        version: 2,
        services: successfullyDeployedServices,
        keyPairName: keyPair.name,
        timestamp: new Date().toISOString(),
        relays: fluenceConfig.relays,
      },
      this
    );
  }
}

type DeployInfo = {
  serviceName: string;
  serviceDirPath: string;
  deployName: string;
  count: number;
  peerId: string | undefined;
  modules: Array<ModuleV0>;
};

const overrideModule = (
  mod: ModuleV0,
  overrideModules: OverrideModules | undefined,
  moduleName: string
): ModuleV0 => ({ ...mod, ...overrideModules?.[moduleName] });

const normalizeGet = (get: string, configDirPath: string): string =>
  isUrl(get) ? get : path.resolve(configDirPath, get);

type PreparedForDeploy = Omit<DeployInfo, "modules" | "serviceDirPath"> & {
  deployJSON: DeployJSONConfig;
};

type GetDeployJSONsOptions = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfigReadonly;
};

const prepareForDeploy = async ({
  commandObj,
  fluenceConfig,
}: GetDeployJSONsOptions): Promise<Array<PreparedForDeploy>> => {
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
    deploy: Record<string, ServiceDeployV1>;
  }>;

  CliUx.ux.action.start("Making sure all services are downloaded");
  const servicePaths = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      ([serviceName, { get, deploy }]): ServicePathPromises =>
        (async (): ServicePathPromises => ({
          serviceName:
            camelcase(serviceName) === serviceName
              ? serviceName
              : commandObj.error(
                  `Service name ${color.yellow(serviceName)} not in camelCase`
                ),
          deploy,
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
    deploy: Record<string, ServiceDeployV1>;
  }>;

  const serviceConfigs = await Promise.all(
    servicePaths.map(
      ({ serviceName, serviceDirPath, deploy }): ServiceConfigPromises =>
        (async (): ServiceConfigPromises => ({
          serviceName,
          deploy,
          serviceConfig:
            (await initReadonlyServiceConfig(serviceDirPath, commandObj)) ??
            commandObj.error(
              `Service ${color.yellow(serviceName)} doesn't have ${color.yellow(
                SERVICE_CONFIG_FILE_NAME
              )}`
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
      Object.entries(deploy).map(
        ([deployName, { count = 1, peerId, overrideModules }]): DeployInfo => ({
          serviceName,
          serviceDirPath,
          deployName:
            camelcase(deployName) === deployName
              ? deployName
              : commandObj.error(
                  `Deploy name ${color.yellow(deployName)} not in camelCase`
                ),
          count,
          peerId: fluenceConfig?.peerIds?.[peerId ?? ""] ?? peerId,
          modules: ((): Array<ModuleV0> => {
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
                )} with deploy ${color.yellow(
                  deployName
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
                ([moduleName, mod]): ModuleV0 =>
                  overrideModule(mod, overrideModules, moduleName)
              ),
              overrideModule(facadeModule, overrideModules, FACADE_MODULE_NAME),
            ];
          })(),
        })
      )
  );

  const setOfAllGets = [
    ...new Set(
      allDeployInfos.flatMap(
        ({ modules, serviceDirPath }): Array<string> =>
          modules.map(({ get }): string => normalizeGet(get, serviceDirPath))
      )
    ),
  ];

  CliUx.ux.action.start("Making sure all modules are downloaded");
  const mapOfAllModuleConfigs = new Map(
    await Promise.all(
      setOfAllGets.map(
        (get): Promise<[string, ModuleConfigReadonly]> =>
          (async (): Promise<[string, ModuleConfigReadonly]> => [
            get,
            (isUrl(get)
              ? await initReadonlyModuleConfig(
                  await downloadModule(get),
                  commandObj
                )
              : await initReadonlyModuleConfig(get, commandObj)) ??
              CliUx.ux.action.stop(color.red("error")) ??
              commandObj.error(
                `Module with get: ${color.yellow(
                  get
                )} doesn't have ${color.yellow(MODULE_CONFIG_FILE_NAME)}`
              ),
          ])()
      )
    )
  );
  CliUx.ux.action.stop();

  return allDeployInfos.map(
    ({ modules, serviceDirPath, ...rest }): PreparedForDeploy => {
      const deployJSON = {
        [DEFAULT_DEPLOY_NAME]: {
          modules: modules.map(({ get, ...overrides }): JSONModuleConf => {
            const moduleConfig =
              mapOfAllModuleConfigs.get(normalizeGet(get, serviceDirPath)) ??
              commandObj.error(
                `Unreachable. Wasn't able to find module config for ${get}`
              );
            return serviceModuleToJSONModuleConfig(moduleConfig, overrides);
          }),
        },
      };
      return {
        ...rest,
        deployJSON,
      };
    }
  );
};

const ARCHIVE_FILE = "archive.tar.gz";

const getHashPath = async (get: string, dir: string): Promise<string> =>
  path.join(dir, `${stringToServiceName(get)}_${await getHashOfString(get)}`);

const downloadAndDecompress = async (
  get: string,
  dir: string
): Promise<string> => {
  const dirPath = await getHashPath(get, dir);
  try {
    await fsPromises.access(dirPath);
    return dirPath;
  } catch {}
  await fsPromises.mkdir(dirPath, { recursive: true });
  const archivePath = path.join(dirPath, ARCHIVE_FILE);
  await downloadFile(archivePath, get);
  await decompress(archivePath, dirPath);
  await fsPromises.unlink(archivePath);
  return dirPath;
};

const downloadModule = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureFluenceModulesDir());

const downloadService = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureFluenceServicesDir());

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
    path: path.resolve(
      path.dirname(moduleConfig.$getPath()),
      `${overriddenConfig.name}.${WASM_EXT}`
    ),
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

type DeployServiceOptions = Readonly<{
  deployJSON: DeployJSONConfig;
  relay: string;
  secretKey: string;
  aquaCli: AquaCLI;
  timeout: number | undefined;
  serviceName: string;
  deployName: string;
  tmpDeployJSONPath: string;
  commandObj: CommandObj;
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
  deployName,
  relay,
  secretKey,
  aquaCli,
  tmpDeployJSONPath,
  timeout,
  commandObj,
}: DeployServiceOptions & { peerId: string }): Promise<{
  deployedServiceConfig: DeployedServiceConfig;
  serviceName: string;
  deployName: string;
} | null> => {
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
      { service: `${serviceName}.${deployName}`, on: peerId }
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
    deployName,
  };
};

/**
 * Deploy a service and then deploy zero or more services using the blueprint
 * id of the first service that was deployed
 * @param param0 Readonly<{ deployServiceOptions: DeployServiceOptions; count: number; commandObj: CommandObj;}>
 * @returns Promise<DeployedServiceConfig[] | null>
 */
/*
const deployServices = async ({
  count,
  deployServiceOptions,
  commandObj,
  relays,
  peerId: peerIdFromConfig,
}: Readonly<{
  deployServiceOptions: DeployServiceOptions;
  peerId: string | undefined;
  count: number;
  commandObj: CommandObj;
  relays: Relays;
}>): Promise<{
  deployedServiceConfigs: Array<DeployedServiceConfig>;
  name: string;
} | null> => {
  const peerId = peerIdFromConfig ?? getRandomRelayId(relays);
  const result = await deployService({
    ...deployServiceOptions,
    peerId,
    commandObj,
  });

  if (result instanceof Error) {
    commandObj.warn(result.message);
    return null;
  }

  const { deployedServiceConfig, name } = result;
  const { secretKey, addr, aquaCli, timeout } = deployServiceOptions;
  const { blueprintId } = deployedServiceConfig;

  const services = [deployedServiceConfig];

  let servicesToDeployCount = count - 1;

  // deploy by blueprintId 'servicesToDeployCount' number of times
  while (servicesToDeployCount > 0) {
    const peerId = peerIdFromConfig ?? getRandomRelayId(relays);
    let result: string;
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await aquaCli(
        {
          command: "remote create_service",
          flags: {
            id: blueprintId,
            addr,
            sk: secretKey,
            on: peerId,
            timeout,
          },
        },
        "Deploying service",
        {
          blueprintId,
          on: peerId,
          relay: addr,
        }
      );
    } catch (error) {
      commandObj.warn(`Wasn't able to deploy service\n${String(error)}`);
      continue;
    }

    const [, serviceId] = /"(.*)"/.exec(result) ?? [];

    if (serviceId === undefined) {
      commandObj.warn(
        `Deployment finished without errors but not able to parse serviceId from aqua cli output:\n\n${result}`
      );
      continue;
    }

    services.push({ blueprintId, serviceId, peerId });
    servicesToDeployCount = servicesToDeployCount - 1;
  }

  return { name, deployedServiceConfigs: services };
};
*/
