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
import {
  get_logs,
  Get_logsArgApp_workers,
} from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initDeployedConfig } from "../../lib/configs/project/deployed.js";
import {
  KEY_PAIR_FLAG,
  TIMEOUT_FLAG,
  PRIV_KEY_FLAG,
  DEALS_CONFIG_FILE_NAME,
  NETWORK_FLAG,
  DEPLOYED_CONFIG_FILE_NAME,
} from "../../lib/const.js";
import { parseWorkers } from "../../lib/deployWorkers.js";
import { getExistingKeyPairFromFlags } from "../../lib/keypairs.js";
import { initCli } from "../../lib/lifecyle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { getRandomRelayAddr } from "../../lib/multiaddres.js";

const DEFAULT_TTL = 60000;

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Deploy workers according to deal in ${DEALS_CONFIG_FILE_NAME}`;
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
    ...NETWORK_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Names of workers to deploy (by default all deals from ${DEALS_CONFIG_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Logs),
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

    const deployedConfig = await initDeployedConfig();
    const workerNamesString = args["WORKER-NAMES"];

    const workerNamesSet = [
      ...new Set(deployedConfig.workers.map(({ name }) => name)),
    ];

    const workersToGetLogsFor =
      workerNamesString === undefined
        ? workerNamesSet
        : parseWorkers(workerNamesString);

    const workerNamesNotFoundInWorkersConfig = workersToGetLogsFor.filter(
      (workerName) => !workerNamesSet.includes(workerName)
    );

    if (workerNamesNotFoundInWorkersConfig.length !== 0) {
      commandObj.error(
        `Wasn't able to find workers ${workerNamesNotFoundInWorkersConfig
          .map((workerName) => color.yellow(workerName))
          .join(", ")} in ${color.yellow(
          DEPLOYED_CONFIG_FILE_NAME
        )} please check the spelling and try again`
      );
    }

    const workersArg: Get_logsArgApp_workers = {
      workers: deployedConfig.workers.filter(({ name }) =>
        workersToGetLogsFor.includes(name)
      ),
    };

    const logs = await get_logs(fluencePeer, workersArg);

    commandObj.log(
      logs
        .map(
          ({ host_id, logs, spell_id, worker_name }) =>
            `${color.yellow(
              worker_name
            )} (host_id: ${host_id}, spell_id: ${spell_id}):\n\n${logs.join(
              "\n"
            )}`
        )
        .join("\n\n")
    );
  }
}
