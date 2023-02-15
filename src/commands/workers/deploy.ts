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
import path, { isAbsolute, resolve } from "node:path";

import { FluencePeer, KeyPair } from "@fluencelabs/fluence";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { upload_deploy } from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  UploadArgConfig,
  upload,
} from "../../lib/compiled-aqua/installation-spell/config.js";
import { spellInstallAirScript } from "../../lib/compiled-aqua/installation-spell/spell.js";
import type { InitializedReadonlyConfig } from "../../lib/configs/initConfig.js";
import {
  initReadonlyDealsConfig,
  MIN_WORKERS,
  TARGET_WORKERS,
} from "../../lib/configs/project/deals.js";
import { initNewReadonlyProjectSecretsConfig } from "../../lib/configs/project/deployed.js";
import type { FluenceConfig } from "../../lib/configs/project/fluence.js";
import { initFluenceLockConfig } from "../../lib/configs/project/fluenceLock.js";
import { initReadonlyHostsConfig } from "../../lib/configs/project/hosts.js";
import {
  ConfigV0,
  initReadonlyModuleConfig,
  ModuleConfigReadonly,
} from "../../lib/configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
} from "../../lib/configs/project/service.js";
import {
  initReadonlyWorkersConfig,
  WorkersConfigReadonly,
} from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  TIMEOUT_FLAG,
  MODULE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
  HOSTS_CONFIG_FILE_NAME,
  DEALS_CONFIG_FILE_NAME,
  PRIV_KEY_FLAG,
} from "../../lib/const.js";
import { dealCreate } from "../../lib/dealCreate.js";
import {
  downloadModule,
  downloadService,
  getModuleWasmPath,
  isUrl,
} from "../../lib/helpers/downloadFile.js";
import { getExistingKeyPairFromFlags } from "../../lib/keypairs.js";
import { initCli } from "../../lib/lifecyle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { getRandomRelayAddr } from "../../lib/multiaddres.js";
import { projectRootDirPromise } from "../../lib/paths.js";

const DEFAULT_TTL = 60000;

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy workers to hosts, described in ${HOSTS_CONFIG_FILE_NAME}`;
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
    ttl: Flags.integer({
      description: `Sets the default TTL for all particles originating from the peer with no TTL specified. If the originating particle's TTL is defined then that value will be used If the option is not set default TTL will be ${DEFAULT_TTL}`,
      helpValue: "<milliseconds>",
    }),
    ...KEY_PAIR_FLAG,
    "aqua-logs": Flags.boolean({
      description: "Enable Aqua logs",
    }),
    direct: Flags.boolean({
      description: `Deploy workers directly to hosts (use ${HOSTS_CONFIG_FILE_NAME} config instead of ${DEALS_CONFIG_FILE_NAME})`,
    }),
    ...PRIV_KEY_FLAG,
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig } = await initCli(
      this,
      await this.parse(Deploy),
      true
    );

    const defaultKeyPair = await getExistingKeyPairFromFlags(
      flags,
      fluenceConfig
    );

    if (defaultKeyPair instanceof Error) {
      this.error(defaultKeyPair.message);
    }

    const secretKey = defaultKeyPair.secretKey;

    const relay = flags.relay ?? getRandomRelayAddr(fluenceConfig.relays);

    const fluencePeer = new FluencePeer();

    await fluencePeer.start({
      dialTimeoutMs: flags.timeout ?? DEFAULT_TTL,
      defaultTtlMs: flags.ttl ?? DEFAULT_TTL,
      connectTo: relay,
      ...(secretKey === undefined
        ? {}
        : {
            KeyPair: await KeyPair.fromEd25519SK(
              Buffer.from(secretKey, "base64")
            ),
          }),
    });

    doRegisterIpfsClient(fluencePeer, flags["aqua-logs"]);
    doRegisterLog(fluencePeer, flags["aqua-logs"]);

    const workersConfig = await initReadonlyWorkersConfig(fluenceConfig);

    if (flags.direct) {
      await hostDirectly({ workersConfig, fluenceConfig, fluencePeer });
      commandObj.log("Successfully deployed");
      return;
    }

    await hostUsingDeals({
      workersConfig,
      fluenceConfig,
      fluencePeer,
      privKey: flags.privKey,
    });
  }
}

type PrepareForDeployArg = {
  fluenceConfig: FluenceConfig;
  arrayWithWorkerNames: Array<{ workerName: string; peerIds?: Array<string> }>;
  workersConfig: WorkersConfigReadonly;
};

const prepareForDeploy = async ({
  arrayWithWorkerNames,
  fluenceConfig,
  workersConfig,
}: PrepareForDeployArg): Promise<UploadArgConfig> => {
  const workersToHost = [
    ...new Set(arrayWithWorkerNames.map(({ workerName }) => workerName)),
  ];

  const workerConfigs = workersToHost.map((workerName) => {
    const workerConfig = workersConfig.workers[workerName];
    assert(workerConfig !== undefined);
    return {
      workerName,
      workerConfig,
    };
  });

  const serviceNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => workerConfig.services)
    ),
  ];

  const serviceConfigs = await Promise.all(
    serviceNames.map((serviceName) =>
      (async () => {
        const { get = undefined, overrideModules = undefined } =
          fluenceConfig?.services?.[serviceName] ?? {};

        assert(get !== undefined);

        const serviceDirPath = isUrl(get)
          ? await downloadService(get)
          : path.resolve(await projectRootDirPromise, get);

        const serviceConfig = await initReadonlyServiceConfig(serviceDirPath);

        if (serviceConfig === null) {
          return commandObj.error(
            `${
              isUrl(get)
                ? `Downloaded invalid service ${color.yellow(
                    serviceName
                  )} from ${color.yellow(get)}`
                : `Invalid service ${color.yellow(serviceName)}`
            }. No ${SERVICE_CONFIG_FILE_NAME} found at ${color.yellow(
              serviceDirPath
            )}`
          );
        }

        return {
          serviceName,
          overrideModules,
          serviceConfig,
          serviceDirPath,
        };
      })()
    )
  );

  const modulesUrls = [
    ...new Set(
      serviceConfigs
        .flatMap(({ serviceConfig }) =>
          Object.values(serviceConfig.modules).map(({ get }) => get)
        )
        .filter((get) => isUrl(get))
    ),
  ];

  const modulePathsMap = new Map<string, string>(
    await Promise.all(
      modulesUrls.map(
        (url): Promise<[string, string]> =>
          (async () => [url, await downloadModule(url)])()
      )
    )
  );

  serviceConfigs
    .flatMap(({ serviceConfig, serviceDirPath }) =>
      Object.values(serviceConfig.modules).map(({ get }) => ({
        get,
        serviceDirPath,
      }))
    )
    .filter(({ get }) => !isUrl(get))
    .forEach(({ get, serviceDirPath }) => {
      if (isAbsolute(get)) {
        modulePathsMap.set(get, get);
        return;
      }

      const absolutePath = resolve(serviceDirPath, get);
      modulePathsMap.set(absolutePath, absolutePath);
    });

  const moduleConfigsMap = new Map<string, InitializedReadonlyConfig<ConfigV0>>(
    await Promise.all(
      [...modulePathsMap.entries()].map(([absolutePathOrUrl, moduleDirPath]) =>
        (async (): Promise<[string, InitializedReadonlyConfig<ConfigV0>]> => {
          const moduleConfig = await initReadonlyModuleConfig(moduleDirPath);

          if (moduleConfig === null) {
            return commandObj.error(
              `${
                isUrl(absolutePathOrUrl)
                  ? `Downloaded invalid module from ${color.yellow(
                      absolutePathOrUrl
                    )}`
                  : `Invalid module`
              }. No ${MODULE_CONFIG_FILE_NAME} found at ${color.yellow(
                moduleDirPath
              )}`
            );
          }

          return [absolutePathOrUrl, moduleConfig];
        })()
      )
    )
  );

  const fluenceLockConfig = await initFluenceLockConfig();

  const marineCli = await initMarineCli(fluenceConfig, fluenceLockConfig);

  await Promise.all(
    [...moduleConfigsMap.values()]
      .filter(({ type }) => type === "rust")
      .map((moduleConfig) =>
        marineCli({
          args: ["build"],
          flags: { release: true },
          cwd: path.dirname(moduleConfig.$getPath()),
        })
      )
  );

  const workers: UploadArgConfig["workers"] = arrayWithWorkerNames.map(
    ({ workerName, peerIds = [] }) => {
      const workerConfig = workersConfig.workers[workerName];
      assert(workerConfig !== undefined);

      const services = workerConfig.services.map((serviceName) => {
        const serviceConfig = serviceConfigs.find(
          ({ serviceName: name }) => name === serviceName
        );

        assert(serviceConfig !== undefined);
        const { overrideModules = undefined } = serviceConfig;

        const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
          serviceConfig.serviceConfig.modules;

        const modules = [
          ...Object.entries(otherModules),
          [FACADE_MODULE_NAME, facadeModule] as const,
        ].map(([name, { get }]) => {
          const moduleConfig = moduleConfigsMap.get(
            isUrl(get) || isAbsolute(get)
              ? get
              : resolve(serviceConfig.serviceDirPath, get)
          );

          assert(moduleConfig !== undefined);

          const overriddenModuleConfig = {
            ...moduleConfig,
            ...overrideModules?.[name],
          };

          return {
            wasm: getModuleWasmPath(overriddenModuleConfig),
            config: JSON.stringify(
              serviceModuleToJSONModuleConfig(overriddenModuleConfig)
            ),
          };
        });

        return {
          name: serviceName,
          modules,
        };
      });

      return {
        name: workerName,
        hosts: peerIds,
        config: {
          services,
          spells: [],
        },
      };
    }
  );

  return {
    workers: workers,
    installation_script: spellInstallAirScript,
    installation_trigger: {
      clock: { start_sec: 1676293670, end_sec: 0, period_sec: 600 },
      connections: { connect: false, disconnect: false },
      blockchain: { start_block: 0, end_block: 0 },
    },
  };
};

type HostDirectlyArg = {
  fluenceConfig: FluenceConfig;
  workersConfig: WorkersConfigReadonly;
  fluencePeer: FluencePeer;
};

const hostDirectly = async ({
  workersConfig,
  fluenceConfig,
  fluencePeer,
}: HostDirectlyArg) => {
  const hostsConfig = await initReadonlyHostsConfig(
    fluenceConfig,
    workersConfig
  );

  const uploadDeployArg = await prepareForDeploy({
    arrayWithWorkerNames: hostsConfig.hosts,
    fluenceConfig,
    workersConfig,
  });

  const result = await upload_deploy(fluencePeer, uploadDeployArg);
  await initNewReadonlyProjectSecretsConfig(result);
};

type HostUsingDeals = {
  fluenceConfig: FluenceConfig;
  workersConfig: WorkersConfigReadonly;
  fluencePeer: FluencePeer;
  privKey: undefined | string;
};

const hostUsingDeals = async ({
  workersConfig,
  fluenceConfig,
  fluencePeer,
  privKey,
}: HostUsingDeals) => {
  const dealsConfig = await initReadonlyDealsConfig(workersConfig);

  const uploadDeployArg = await prepareForDeploy({
    arrayWithWorkerNames: dealsConfig.deals,
    fluenceConfig,
    workersConfig,
  });

  const uploadResult = await upload(fluencePeer, uploadDeployArg);

  for (const {
    workerName,
    minWorkers = MIN_WORKERS,
    targetWorkers = TARGET_WORKERS,
  } of dealsConfig.deals) {
    const workerDefinitionCid = uploadResult.workers.find(
      ({ name }) => name === workerName
    )?.definition;

    assert(workerDefinitionCid !== undefined);
    commandObj.log(`Creating deal for worker ${color.yellow(workerName)}`);

    const dealAddress = await dealCreate({
      network: dealsConfig.network ?? "testnet",
      privKey,
      appCID: workerDefinitionCid,
      minWorkers,
      targetWorkers,
    });

    commandObj.log(
      `Deal contract for worker ${color.yellow(
        workerName
      )} with cid ${workerDefinitionCid} created: ${color.yellow(dealAddress)}`
    );
  }
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

const serviceModuleToJSONModuleConfig = (
  moduleConfig: ModuleConfigReadonly
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

  return jsonModuleConfig;
};
/* eslint-enable camelcase */
