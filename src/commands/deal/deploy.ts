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

import { FluencePeer, KeyPair } from "@fluencelabs/fluence";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { upload_deploy } from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  initReadonlyDealsConfig,
  MIN_WORKERS,
  TARGET_WORKERS,
} from "../../lib/configs/project/deals.js";
import { initDeployedConfig } from "../../lib/configs/project/deployed.js";
import { initReadonlyWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  TIMEOUT_FLAG,
  PRIV_KEY_FLAG,
  DEALS_CONFIG_FILE_NAME,
  NETWORK_FLAG,
  WORKERS_CONFIG_FILE_NAME,
} from "../../lib/const.js";
import { dealCreate, dealUpdate } from "../../lib/deal.js";
import { prepareForDeploy } from "../../lib/deployWorkers.js";
import { getExistingKeyPairFromFlags } from "../../lib/keypairs.js";
import { initCli } from "../../lib/lifecyle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { getRandomRelayAddr } from "../../lib/multiaddres.js";
import { confirm } from "../../lib/prompt.js";
import { ensureChainNetwork } from "../../lib/provider.js";

const DEFAULT_TTL = 60000;

export default class Deploy extends BaseCommand<typeof Deploy> {
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

    const dealsConfig = await initReadonlyDealsConfig(workersConfig);

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: dealsConfig.network,
    });

    const uploadArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      arrayWithWorkerNames: dealsConfig.deals,
      fluenceConfig,
      workersConfig,
    });

    const errorMessages = uploadArg.workers
      .map<string | null>(({ config: { services }, name }) => {
        if (services.length === 0) {
          return `Worker ${color.yellow(
            name
          )} has no services listed in ${WORKERS_CONFIG_FILE_NAME}`;
        }

        return null;
      })
      .filter<string>(
        (errorMessage): errorMessage is string => errorMessage !== null
      );

    if (errorMessages.length > 0) {
      commandObj.error(errorMessages.join("\n"));
    }

    const uploadDeployResult = await upload_deploy(fluencePeer, uploadArg);
    const deployedConfig = await initDeployedConfig();

    for (const { name: workerName } of [...uploadArg.workers]) {
      const uploadedWorker = uploadDeployResult.workers.find(
        (worker) => workerName === worker.name
      );

      assert(uploadedWorker !== undefined);
      const { definition: appCID, installation_spells } = uploadedWorker;
      const deal = dealsConfig.deals.find((d) => d.workerName === workerName);
      assert(deal !== undefined);
      const { minWorkers = MIN_WORKERS, targetWorkers = TARGET_WORKERS } = deal;

      const previouslyDeployedDealIndex = deployedConfig.workers.findIndex(
        (d) => d.name === workerName
      );

      const maybePreviouslyDeployedDeal =
        deployedConfig.workers[previouslyDeployedDealIndex];

      if (
        maybePreviouslyDeployedDeal !== undefined &&
        network === maybePreviouslyDeployedDeal.network &&
        maybePreviouslyDeployedDeal.dealAddress !== undefined &&
        (await confirm({
          message: `There is a previously deployed deal for worker ${color.yellow(
            workerName
          )} on network ${color.yellow(
            network
          )}. Do you want to update this existing deal?`,
        }))
      ) {
        commandObj.log(
          `\nUpdating deal for worker ${color.yellow(workerName)}\n`
        );

        await dealUpdate({
          network,
          privKey: flags.privKey,
          appCID,
          dealAddress: maybePreviouslyDeployedDeal.dealAddress,
        });

        maybePreviouslyDeployedDeal.timestamp = new Date().toISOString();
        maybePreviouslyDeployedDeal.installation_spells = installation_spells;

        deployedConfig.workers.splice(
          previouslyDeployedDealIndex,
          1,
          maybePreviouslyDeployedDeal
        );

        await deployedConfig.$commit();

        continue;
      }

      commandObj.log(
        `\nCreating deal for worker ${color.yellow(workerName)}\n`
      );

      const dealAddress = await dealCreate({
        network: dealsConfig.network ?? "testnet",
        privKey: flags.privKey,
        appCID,
        minWorkers,
        targetWorkers,
      });

      deployedConfig.workers.push({
        installation_spells,
        definition: appCID,
        name: workerName,
        timestamp: new Date().toISOString(),
        dealAddress,
        network,
      });

      await deployedConfig.$commit();
    }
  }
}
