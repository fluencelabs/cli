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
import { writeFile } from "node:fs/promises";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../baseCommand";
import { build, BuildArg } from "../lib/build";
import type { ConfigKeyPair } from "../lib/configs/keyPair";
import {
  Distribution,
  DISTRIBUTION_EVEN,
} from "../lib/configs/project/fluence";
import { initFluenceLockConfig } from "../lib/configs/project/fluenceLock";
import type { ModuleConfigReadonly } from "../lib/configs/project/module";
import {
  FLUENCE_CONFIG_FILE_NAME,
  KEY_PAIR_FLAG,
  KEY_PAIR_FLAG_NAME,
  TIMEOUT_FLAG,
} from "../lib/const";
import { jsonStringify } from "../lib/helpers/jsonStringify";
import { getExistingKeyPair } from "../lib/keypairs";
import { initCli } from "../lib/lifecyle";
import { initMarineCli } from "../lib/marineCli";
import {
  getEvenlyDistributedIds,
  getEvenlyDistributedIdsFromTheList,
  getRandomRelayId,
  getRandomRelayIdFromTheList,
  Relays,
} from "../lib/multiaddr";
import { ensureFluenceTmpServiceConfigPath } from "../lib/paths";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override hidden = true;
  static override description = `Deploy application, described in ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
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

    // const relay = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);

    const maybeFluenceLockConfig = await initFluenceLockConfig(commandObj);

    const marineCli = await initMarineCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    const preparedForDeploy = await prepareForDeploy({
      commandObj,
      defaultKeyPair,
      fluenceConfig,
      marineCli,
      isInteractive,
    });

    type CollectedForEachPeerResult = Record<
      string,
      Array<{
        localServiceConfig: LocalServiceConfig;
        deployId: string;
        serviceName: string;
        keyPair: ConfigKeyPair;
      }>
    >;

    const collectedForEachPeer =
      preparedForDeploy.reduce<CollectedForEachPeerResult>(
        (acc, { peerId, modules, serviceName, deployId, ...rest }) => {
          if (!(peerId in acc)) {
            acc[peerId] = [];
          }

          const configsByPeerId = acc[peerId];
          assert(configsByPeerId !== undefined);

          configsByPeerId.push({
            ...rest,
            deployId,
            serviceName,
            localServiceConfig: {
              name: `${serviceName}_${deployId}`,
              modules,
            },
          });

          return acc;
        },
        {}
      );

    const localAppConfigsByUniqueConfig = Object.entries(collectedForEachPeer)
      .map(([peerId, configs]) => {
        const configsByName = configs
          .map(({ localServiceConfig }) => localServiceConfig)
          .reduce<Record<string, Array<LocalServiceConfig>>>(
            (acc, localServiceConfig) => {
              if (!(localServiceConfig.name in acc)) {
                acc[localServiceConfig.name] = [];
              }

              const configsByName = acc[localServiceConfig.name];
              assert(configsByName !== undefined);

              configsByName.push(localServiceConfig);

              return acc;
            },
            {}
          );

        const servicesWithUniqueNames = Object.values(configsByName).flatMap(
          (configs) =>
            configs.map((config, i) => ({
              ...config,
              name: `${config.name}_${i}`,
            }))
        );

        return {
          peerId,
          config: {
            services: servicesWithUniqueNames,
          },
        };
      })
      .reduce<
        Record<string, { peerIds: Array<string>; config: LocalAppConfig }>
      >((acc, { peerId, config }) => {
        const configsString = JSON.stringify(config);

        if (!(configsString in acc)) {
          acc[configsString] = { peerIds: [], config };
        }

        const configsByUniqueConfig = acc[configsString];
        assert(configsByUniqueConfig !== undefined);

        configsByUniqueConfig.peerIds.push(peerId);

        return acc;
      }, {});

    console.log(
      JSON.stringify(Object.values(localAppConfigsByUniqueConfig), null, 2)
    );
  }
}

type LocalModuleConfig = {
  wasm: string;
  config: string;
};
type LocalServiceConfig = {
  name: string;
  modules: Array<LocalModuleConfig>;
};
type LocalAppConfig = {
  services: Array<LocalServiceConfig>;
};

const prepareForDeploy = async (buildArg: BuildArg) => {
  const { fluenceConfig } = buildArg;
  const serviceInfos = await build(buildArg);

  return Promise.all(
    serviceInfos.flatMap(
      ({
        peerId,
        peerIds,
        distribution,
        count,
        moduleConfigs,
        ...serviceInfo
      }) =>
        getPeerIds({
          peerId: peerIds ?? peerId,
          distribution,
          count,
          relays: fluenceConfig.relays,
          namedPeerIds: fluenceConfig.peerIds,
        }).map((peerId: string) =>
          (async () => ({
            ...serviceInfo,
            peerId,
            modules: await Promise.all(
              moduleConfigs.map((moduleConfig) =>
                serviceModuleToJSONModuleConfig({
                  ...moduleConfig,
                  configPathPromise: ensureFluenceTmpServiceConfigPath({
                    deployId: serviceInfo.deployId,
                    serviceName: serviceInfo.serviceName,
                    moduleName: moduleConfig.name,
                  }),
                })
              )
            ),
          }))()
        )
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
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  mapped_dirs?: Array<[string, string]>;
  preopened_files?: Array<string>;
  envs?: Array<[string, string]>;
  mounted_binaries?: Array<[string, string]>;
};

type Path = string;

const serviceModuleToJSONModuleConfig = async (
  moduleConfig: ModuleConfigReadonly & {
    wasmPath: string;
    configPathPromise: Promise<string>;
  }
): Promise<{ config: Path; wasm: Path }> => {
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
    configPathPromise,
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

  const configPath = await configPathPromise;
  await writeFile(configPath, jsonStringify(jsonModuleConfig));

  return {
    config: configPath,
    wasm: wasmPath,
  };
};
/* eslint-enable camelcase */
