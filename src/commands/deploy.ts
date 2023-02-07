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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Flags } from "@oclif/core";
import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { AquaCLI, initAquaCli } from "../lib/aquaCli.js";
import { build, BuildArg, ServiceInfo } from "../lib/build.js";
import {
  DeployedServiceConfig,
  initAppConfig,
  initNewReadonlyAppConfig,
  ServicesV3,
} from "../lib/configs/project/app.js";
import {
  Distribution,
  DISTRIBUTION_EVEN,
} from "../lib/configs/project/fluence.js";
import { initFluenceLockConfig } from "../lib/configs/project/fluenceLock.js";
import type { ModuleConfigReadonly } from "../lib/configs/project/module.js";
import {
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  KEY_PAIR_FLAG_NAME,
  TIMEOUT_FLAG,
  TIMEOUT_FLAG_NAME,
} from "../lib/const.js";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp.js";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs.js";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir.js";
import { getExistingKeyPair } from "../lib/keypairs.js";
import { initCli } from "../lib/lifecyle.js";
import { initMarineCli } from "../lib/marineCli.js";
import {
  getEvenlyDistributedIds,
  getEvenlyDistributedIdsFromTheList,
  getRandomRelayAddr,
  getRandomRelayId,
  getRandomRelayIdFromTheList,
  Relays,
} from "../lib/multiaddr.js";
import { ensureFluenceTmpDeployJsonPath } from "../lib/paths.js";
import { confirm } from "../lib/prompt.js";
import { removeApp } from "../lib/removeApp.js";
import { hasKey } from "../lib/typeHelpers.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy application, described in ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    relay: Flags.string({
      description: "Relay node multiaddr",
      helpValue: "<multiaddr>",
    }),
    force: Flags.boolean({
      description: "Force removing of previously deployed app",
    }),
    ...TIMEOUT_FLAG,
    ...KEY_PAIR_FLAG,
  };
  async run(): Promise<void> {
    const { commandObj, flags, isInteractive, fluenceConfig } = await initCli(
      this,
      await this.parse(Deploy),
      true
    );

    const defaultKeyPair = await getExistingKeyPair({
      keyPairName: flags[KEY_PAIR_FLAG_NAME] ?? fluenceConfig.keyPairName,
      commandObj,
      isInteractive,
    });

    if (defaultKeyPair instanceof Error) {
      this.error(defaultKeyPair.message);
    }

    const relay = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);

    const maybeFluenceLockConfig = await initFluenceLockConfig(commandObj);

    const marineCli = await initMarineCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    const preparedForDeployItems = await prepareForDeploy({
      commandObj,
      fluenceConfig,
      defaultKeyPair,
      isInteractive,
      marineCli,
    });

    const aquaCli = await initAquaCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    const tmpDeployJSONPath = await ensureFluenceTmpDeployJsonPath();
    let appConfig = await initAppConfig(this);

    if (
      appConfig !== null &&
      Object.keys(appConfig.services).length > 0 &&
      (flags.force ||
        (isInteractive
          ? await confirm({
              isInteractive,
              message:
                "Do you want to select previously deployed services that you want to remove?",
            })
          : true))
    ) {
      appConfig = await removeApp({
        appConfig,
        commandObj,
        isInteractive,
        timeout: flags[TIMEOUT_FLAG_NAME],
        aquaCli,
      });
    }

    const allServices: ServicesV3 = appConfig?.services ?? {};

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
        commandObj,
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
      }
    }

    if (Object.keys(allServices).length === 0) {
      return;
    }

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
      logResults(appConfig.$getPath());
      return;
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

type PreparedForDeploy = Omit<
  ServiceInfo,
  | "peerId"
  | "peerIds"
  | "distribution"
  | "count"
  | "serviceDirPath"
  | "moduleConfigs"
> & {
  peerId: string;
  deployJSON: DeployJSONConfig;
};

const prepareForDeploy = async (
  buildArg: BuildArg
): Promise<Array<PreparedForDeploy>> => {
  const { fluenceConfig } = buildArg;
  const serviceInfos = await build(buildArg);

  return serviceInfos.flatMap(
    ({
      peerId,
      peerIds,
      distribution,
      count,
      moduleConfigs,
      ...serviceInfo
    }): Array<PreparedForDeploy> =>
      getPeerIds({
        peerId: peerIds ?? peerId,
        distribution,
        count,
        relays: fluenceConfig.relays,
        namedPeerIds: fluenceConfig.peerIds,
      }).map(
        (peerId: string): PreparedForDeploy => ({
          ...serviceInfo,
          peerId,
          deployJSON: {
            [DEFAULT_DEPLOY_NAME]: {
              modules: moduleConfigs.map(
                (moduleConfig): JSONModuleConf =>
                  serviceModuleToJSONModuleConfig(moduleConfig)
              ),
            },
          },
        })
      )
  );
};

type GetPeerIdsArg = {
  peerId: undefined | string | Array<string>;
  distribution: Distribution | undefined;
  count: number | undefined;
  relays: Relays;
  namedPeerIds: Record<string, string> | undefined;
};

const getPeerIds = ({
  peerId,
  distribution = DISTRIBUTION_EVEN,
  count,
  relays,
  namedPeerIds = {},
}: GetPeerIdsArg): Array<string> => {
  const getNamedPeerIds = (peerIds: Array<string>): string[] =>
    peerIds.map((peerId): string => namedPeerIds[peerId] ?? peerId);

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
