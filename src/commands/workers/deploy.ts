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

import { FluencePeer, KeyPair } from "@fluencelabs/fluence";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { upload_deploy } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initDeployedConfig } from "../../lib/configs/project/deployed.js";
import { initReadonlyHostsConfig } from "../../lib/configs/project/hosts.js";
import { initReadonlyWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  TIMEOUT_FLAG,
  HOSTS_CONFIG_FILE_NAME,
  PRIV_KEY_FLAG,
  WORKERS_CONFIG_FILE_NAME,
} from "../../lib/const.js";
import { prepareForDeploy } from "../../lib/deployWorkers.js";
import { getExistingKeyPairFromFlags } from "../../lib/keypairs.js";
import { initCli } from "../../lib/lifecyle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { getRandomRelayAddr } from "../../lib/multiaddres.js";

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
    ...TIMEOUT_FLAG,
    ttl: Flags.integer({
      description: `Sets the default TTL for all particles originating from the peer with no TTL specified. If the originating particle's TTL is defined then that value will be used If the option is not set default TTL will be ${DEFAULT_TTL}`,
      helpValue: "<milliseconds>",
    }),
    ...KEY_PAIR_FLAG,
    "aqua-logs": Flags.boolean({
      description: "Enable Aqua logs",
    }),
    ...PRIV_KEY_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Names of workers to deploy (by default all workers from ${HOSTS_CONFIG_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
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

    const hostsConfig = await initReadonlyHostsConfig(
      fluenceConfig,
      workersConfig
    );

    const uploadDeployArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      arrayWithWorkerNames: hostsConfig.hosts,
      fluenceConfig,
      workersConfig,
    });

    const errorMessages = uploadDeployArg.workers.reduce<Array<string>>(
      (acc, { config: { services }, hosts, name }) => {
        if (services.length === 0) {
          acc.push(
            `Worker ${color.yellow(
              name
            )} has no services listed in ${WORKERS_CONFIG_FILE_NAME}`
          );
        }

        if (hosts.length === 0) {
          acc.push(
            `Worker ${color.yellow(
              name
            )} has no peerIds listed in ${HOSTS_CONFIG_FILE_NAME}`
          );
        }

        return acc;
      },
      []
    );

    if (errorMessages.length > 0) {
      commandObj.error(errorMessages.join("\n"));
    }

    const uploadDeployResult = await upload_deploy(
      fluencePeer,
      uploadDeployArg
    );

    const newDeployedConfig = {
      ...uploadDeployResult,
      workers: uploadDeployResult.workers.map((worker) => ({
        ...worker,
        timestamp: new Date().toISOString(),
      })),
    };

    const deployedConfig = await initDeployedConfig();
    deployedConfig.workers.push(...newDeployedConfig.workers);
    await deployedConfig.$commit();
    commandObj.log("Successfully deployed");
  }
}
