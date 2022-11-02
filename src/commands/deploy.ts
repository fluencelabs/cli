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
import { yamlDiffPatch } from "yaml-diff-patch";

import { AquaCLI, initAquaCli } from "../lib/aquaCli";
import {
  DeployedServiceConfig,
  initAppConfig,
  initNewReadonlyAppConfig,
  ServicesV3,
} from "../lib/configs/project/app";
import type { ModuleConfigReadonly } from "../lib/configs/project/module";
import type { ModuleV0 } from "../lib/configs/project/service";
import {
  AQUA_EXT,
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FORCE_FLAG_NAME,
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  KEY_PAIR_FLAG_NAME,
  NO_INPUT_FLAG,
  TIMEOUT_FLAG,
  TIMEOUT_FLAG_NAME,
} from "../lib/const";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp";
import {
  getModuleUrlOrAbsolutePath,
  getModuleWasmPath,
} from "../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../lib/helpers/ensureFluenceProject";
import { generateServiceInterface } from "../lib/helpers/generateServiceInterface";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import { ConfigKeyPair, getExistingKeyPair } from "../lib/keypairs";
import { initMarineCli } from "../lib/marineCli";
import { getRandomRelayAddr } from "../lib/multiaddr";
import {
  ensureFluenceAquaServicesDir,
  ensureFluenceTmpDeployJsonPath,
} from "../lib/paths";
import { confirm } from "../lib/prompt";
import { hasKey } from "../lib/typeHelpers";

import { build, resolveServiceInfos } from "./build";
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

type PreparedForDeploy = Omit<DeployInfo, "modules" | "serviceDirPath"> & {
  deployJSON: DeployJSONConfig;
  facadeModuleWasmPath: string;
};

type PrepareForDeployArg = Omit<
  Parameters<typeof resolveServiceInfos>[0] & Parameters<typeof build>[0],
  "allServiceInfos"
>;

const prepareForDeploy = async ({
  marineCli,
  commandObj,
  ...rest
}: PrepareForDeployArg): Promise<Array<PreparedForDeploy>> => {
  const allServiceInfos = await resolveServiceInfos({ commandObj, ...rest });

  const mapOfAllModuleConfigs = await build({
    allServiceInfos,
    commandObj,
    marineCli,
  });

  return allServiceInfos.map(
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
