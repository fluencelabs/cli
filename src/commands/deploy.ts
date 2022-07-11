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
import { Command, Flags } from "@oclif/core";
import camelcase from "camelcase";
import decompress from "decompress";

import { AquaCLI, initAquaCli } from "../lib/aquaCli";
import {
  DeployedServiceConfig,
  initAppConfig,
  initNewReadonlyAppConfig,
  Services,
} from "../lib/configs/project/app";
import { initReadonlyFluenceConfig } from "../lib/configs/project/fluence";
import { initReadonlyModuleConfig } from "../lib/configs/project/module";
import {
  initReadonlyServiceConfig,
  Module,
} from "../lib/configs/project/service";
import {
  CommandObj,
  DEPLOYMENT_CONFIG_FILE_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FORCE_FLAG_NAME,
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  MODULE_FILE_NAME,
  NO_INPUT_FLAG,
  SERVICE_FILE_NAME,
  TIMEOUT_FLAG,
  YAML_EXT,
} from "../lib/const";
import { updateDeployedAppAqua, generateRegisterApp } from "../lib/deployedApp";
import { downloadFile } from "../lib/helpers/downloadFile";
import { getHashOfString } from "../lib/helpers/getHashOfString";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { usage } from "../lib/helpers/usage";
import { getKeyPairFromFlags } from "../lib/keyPairs/getKeyPair";
import { getRandomRelayId, getRandomRelayAddr, Relays } from "../lib/multiaddr";
import { ensureModulesDir } from "../lib/pathsGetters/getModulesDir";
import { ensureProjectFluenceDirPath } from "../lib/pathsGetters/getProjectFluenceDirPath";
import { ensureServicesDir } from "../lib/pathsGetters/getServicesDir";
import { confirm } from "../lib/prompt";

import { removeApp } from "./remove";

export default class Deploy extends Command {
  static override description = "Deploy service to the remote peer";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    relay: Flags.string({
      description: "Relay node MultiAddress",
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
    await ensureProjectFluenceDirPath(this, isInteractive);

    const deployedConfig = await initAppConfig(this);

    if (deployedConfig !== null) {
      // Prompt user to remove previously deployed app if
      // it was already deployed before
      const doRemove =
        flags[FORCE_FLAG_NAME] ||
        (await confirm({
          message:
            "Currently you need to remove your app to deploy again. Do you want to remove?",
          isInteractive,
          flagName: FORCE_FLAG_NAME,
        }));

      if (!doRemove) {
        this.error("You have to confirm in order to continue");
      }

      await removeApp({
        appConfig: deployedConfig,
        commandObj: this,
        timeout: flags.timeout,
        isInteractive,
      });
    }

    const keyPair = await getKeyPairFromFlags(flags, this, isInteractive);
    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }

    const fluenceConfig = await initReadonlyFluenceConfig(this);
    if (
      fluenceConfig.services === undefined ||
      fluenceConfig.services.length === 0
    ) {
      this.error(
        `Use ${color.yellow(
          "fluence service add"
        )} command to add services you want to deploy to ${color.yellow(
          `${FLUENCE_CONFIG_FILE_NAME}.${YAML_EXT}`
        )} (${fluenceConfig.$getPath()})`
      );
    }
    const addr = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);

    const aquaCli = await initAquaCli(this);
    const successfullyDeployedServices: Services = {};
    for (const { get, deploy } of fluenceConfig.services) {
      let pathToDownloadedService: string | undefined;
      if (get.startsWith("http")) {
        // TODO: remove await inside loop
        // eslint-disable-next-line no-await-in-loop
        pathToDownloadedService = await downloadService(get);
      }

      for (const { count = 1, peerId } of deploy) {
        const resolvedPeerId =
          fluenceConfig.peerIds === undefined
            ? peerId
            : fluenceConfig.peerIds.find(({ name }): boolean => name === peerId)
                ?.id ?? peerId;
        // eslint-disable-next-line no-await-in-loop
        const res = await deployServices({
          count,
          peerId: resolvedPeerId,
          relays: fluenceConfig.relays,
          deployServiceOptions: {
            get: pathToDownloadedService ?? get,
            secretKey: keyPair.secretKey,
            aquaCli,
            timeout: flags.timeout,
            addr,
          },
          commandObj: this,
        });
        if (res !== null) {
          const { deployedServiceConfigs, name } = res;
          successfullyDeployedServices[name] = deployedServiceConfigs;
        }
      }
    }

    if (Object.keys(successfullyDeployedServices).length === 0) {
      this.error("No services were deployed successfully");
    }
    await updateDeployedAppAqua(successfullyDeployedServices);
    await generateRegisterApp({
      deployedServices: successfullyDeployedServices,
      aquaCli,
    });

    await initNewReadonlyAppConfig(
      {
        version: 1,
        services: successfullyDeployedServices,
        keyPairName: keyPair.name,
        timestamp: new Date().toISOString(),
      },
      this
    );
  }
}

const ARCHIVE_FILE = "archive.tar.gz";

const downloadAndDecompress = async (
  get: string,
  dir: string
): Promise<string> => {
  const dirPath = path.join(dir, await getHashOfString(get));
  await fsPromises.mkdir(dirPath, { recursive: true });
  const archivePath = path.join(dirPath, ARCHIVE_FILE);
  await downloadFile(archivePath, get);
  await decompress(archivePath, dirPath);
  return dirPath;
};

const downloadModule = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureModulesDir());

const downloadService = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureServicesDir());

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

const processServiceModules = async (
  modules: Module[],
  resolvedModulePath: string,
  commandObj: CommandObj
): Promise<JSONModuleConf[]> => {
  const moduleDirPaths = await Promise.all(
    modules.map(
      ({ get }): Promise<string> =>
        get.startsWith("http")
          ? downloadModule(get)
          : Promise.resolve(path.join(resolvedModulePath, get))
    )
  );
  return Promise.all(
    moduleDirPaths.map(
      (moduleDirPath): Promise<JSONModuleConf> =>
        (async (): Promise<JSONModuleConf> => {
          const moduleConfigFileName = `${MODULE_FILE_NAME}.${YAML_EXT}`;
          const moduleConfig = await initReadonlyModuleConfig(
            moduleDirPath,
            commandObj
          );
          if (moduleConfig === null) {
            commandObj.error(
              `Module ${color.yellow(
                path.resolve(moduleDirPath)
              )} must contain ${color.yellow(moduleConfigFileName)}`
            );
          }
          const {
            name,
            loggerEnabled,
            loggingMask,
            mappedDirs,
            envs,
            maxHeapSize,
            mountedBinaries,
          } = moduleConfig;
          const jsonModuleConfig: JSONModuleConf = {
            name,
            path: path.join(moduleDirPath, `${name}.wasm`),
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
          if (mappedDirs !== undefined) {
            jsonModuleConfig.mapped_dirs = Object.entries(mappedDirs);
            jsonModuleConfig.preopened_files = Object.values(mappedDirs);
          }
          if (envs !== undefined) {
            jsonModuleConfig.envs = Object.entries(envs);
          }
          if (mountedBinaries !== undefined) {
            jsonModuleConfig.mounted_binaries = Object.entries(mountedBinaries);
          }
          return jsonModuleConfig;
        })()
    )
  );
};
/* eslint-enable camelcase */

type DeployServiceOptions = Readonly<{
  get: string;
  addr: string;
  secretKey: string;
  aquaCli: AquaCLI;
  timeout: string | undefined;
}>;

/**
 * Deploy by first uploading .wasm files and configs, possibly creating a new blueprint
 * @param param0 DeployServiceOptions
 * @returns Promise<Error | DeployedServiceConfig>
 */
const deployService = async ({
  get,
  addr,
  secretKey,
  aquaCli,
  timeout,
  peerId,
  commandObj,
}: DeployServiceOptions & { peerId: string; commandObj: CommandObj }): Promise<
  Error | { deployedServiceConfig: DeployedServiceConfig; name: string }
> => {
  let hasDeployJSON = false;
  let configPath = path.join(get, DEPLOYMENT_CONFIG_FILE_NAME);
  try {
    await fsPromises.access(configPath);
    hasDeployJSON = true;
  } catch {}
  const resolvedModulePath = path.resolve(get);
  let serviceName = path.basename(resolvedModulePath);
  if (!hasDeployJSON) {
    const serviceConfig = await initReadonlyServiceConfig(
      resolvedModulePath,
      commandObj
    );
    if (serviceConfig === null) {
      return new Error(
        `Each service must have ${color.yellow(
          `${SERVICE_FILE_NAME}.${YAML_EXT}`
        )}`
      );
    }

    serviceName = serviceConfig.name;
    const servicesDirPath = await ensureServicesDir();
    const configDirPath = resolvedModulePath.includes(servicesDirPath)
      ? resolvedModulePath
      : path.join(servicesDirPath, await getHashOfString(resolvedModulePath));
    await fsPromises.mkdir(configDirPath, { recursive: true });
    configPath = path.join(configDirPath, DEPLOYMENT_CONFIG_FILE_NAME);
    const jsonModuleConfigs = await processServiceModules(
      [...(serviceConfig.modules ?? []), serviceConfig.facade],
      resolvedModulePath,
      commandObj
    );
    await fsPromises.writeFile(
      configPath,
      JSON.stringify(
        {
          [serviceName]: {
            name: serviceName,
            modules: jsonModuleConfigs,
          },
        },
        null,
        2
      ),
      FS_OPTIONS
    );
  }
  let result: string;
  const projectRootDir = process.cwd();
  try {
    process.chdir(get);
    result = await aquaCli(
      {
        command: "remote deploy_service",
        flags: {
          "config-path": configPath,
          service: serviceName,
          addr,
          sk: secretKey,
          on: peerId,
          timeout,
        },
      },
      "Deploying service",
      { get, on: peerId, relay: addr }
    );
  } catch (error) {
    return new Error(`Wasn't able to deploy service\n${String(error)}`);
  } finally {
    process.chdir(projectRootDir);
    if (!hasDeployJSON) {
      await fsPromises.unlink(configPath);
    }
  }

  const [, blueprintId] = /Blueprint id:\n(.*)/.exec(result) ?? [];
  const [, serviceId] = /And your service id is:\n"(.*)"/.exec(result) ?? [];
  if (blueprintId === undefined || serviceId === undefined) {
    return new Error(
      `Deployment finished without errors but not able to parse serviceId or blueprintId from aqua cli output:\n\n${result}`
    );
  }

  return {
    deployedServiceConfig: { blueprintId, serviceId, peerId },
    name: camelcase(serviceName),
  };
};

/**
 * Deploy a service and then deploy zero or more services using the blueprint
 * id of the first service that was deployed
 * @param param0 Readonly<{ deployServiceOptions: DeployServiceOptions; count: number; commandObj: CommandObj;}>
 * @returns Promise<DeployedServiceConfig[] | null>
 */
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
  const { secretKey, addr, aquaCli, get, timeout } = deployServiceOptions;
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
          get,
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
