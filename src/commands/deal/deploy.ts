/**
 * Copyright 2023 Fluence Labs Limited
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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args } from "@oclif/core";
import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { upload_deploy } from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  MIN_WORKERS,
  TARGET_WORKERS,
} from "../../lib/configs/project/fluence.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  NETWORK_FLAG,
  OFF_AQUA_LOGS_FLAG,
  DEAL_CONFIG,
  FLUENCE_CONFIG_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
} from "../../lib/const.js";
import { dealCreate, dealUpdate } from "../../lib/deal.js";
import {
  ensureAquaFileWithWorkerInfo,
  prepareForDeploy,
} from "../../lib/deployWorkers.js";
import { initFluenceClient } from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { ensureChainNetwork } from "../../lib/provider.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy workers according to deal in 'deals' property in ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Names of workers to deploy (by default all deals from 'deals' property in ${FLUENCE_CONFIG_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Deploy),
      true
    );

    const fluenceClient = await initFluenceClient(flags, fluenceConfig);
    doRegisterIpfsClient(fluenceClient, flags["off-aqua-logs"]);
    doRegisterLog(fluenceClient, flags["off-aqua-logs"]);

    const chainNetwork = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const workersConfig = await initNewWorkersConfig();

    const uploadArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      maybeWorkersConfig: workersConfig,
      fluenceConfig,
    });

    const errorMessages = uploadArg.workers
      .map<string | null>(({ config: { services }, name }) => {
        if (services.length === 0) {
          return `Worker ${color.yellow(
            name
          )} has no services listed in 'workers' property in ${FLUENCE_CONFIG_FILE_NAME}`;
        }

        return null;
      })
      .filter<string>(
        (errorMessage): errorMessage is string => errorMessage !== null
      );

    if (errorMessages.length > 0) {
      commandObj.error(errorMessages.join("\n"));
    }

    const uploadDeployResult = await upload_deploy(fluenceClient, uploadArg);

    const createdDeals: Record<
      string,
      { deal: string; "worker definition": string }
    > = {};

    const updatedDeals: Record<
      string,
      {
        deal: string;
        "old worker definition": string;
        "new worker definition": string;
      }
    > = {};

    for (const { name: workerName } of [...uploadArg.workers]) {
      const uploadedWorker = uploadDeployResult.workers.find(
        (worker) => workerName === worker.name
      );

      assert(uploadedWorker !== undefined);
      const { definition: appCID, installation_spells } = uploadedWorker;
      const deal = fluenceConfig?.deals?.[workerName];
      assert(deal !== undefined);
      const { minWorkers = MIN_WORKERS, targetWorkers = TARGET_WORKERS } = deal;

      const maybePreviouslyDeployedDeal = workersConfig.deals?.[workerName];
      const chainNetworkId = DEAL_CONFIG[chainNetwork].chainId;

      if (maybePreviouslyDeployedDeal !== undefined) {
        if (maybePreviouslyDeployedDeal.definition === appCID) {
          commandObj.log(
            `\nWorker ${color.yellow(
              workerName
            )} didn't change. Skipping deal update`
          );

          continue;
        }

        commandObj.log(
          `\nUpdating deal for worker ${color.yellow(workerName)}\n`
        );

        await dealUpdate({
          network: chainNetwork,
          privKey: flags.privKey,
          appCID,
          dealAddress: maybePreviouslyDeployedDeal.dealId,
        });

        updatedDeals[workerName] = {
          deal: getPolygonScanLink(maybePreviouslyDeployedDeal.dealIdOriginal),
          "old worker definition": maybePreviouslyDeployedDeal.definition,
          "new worker definition": appCID,
        };

        if (workersConfig.deals === undefined) {
          workersConfig.deals = {};
        }

        workersConfig.deals[workerName] = {
          timestamp: new Date().toISOString(),
          installation_spells,
          definition: appCID,
          chainNetwork,
          chainNetworkId: DEAL_CONFIG[chainNetwork].chainId,
          dealIdOriginal: maybePreviouslyDeployedDeal.dealIdOriginal,
          dealId: maybePreviouslyDeployedDeal.dealId,
        };

        await workersConfig.$commit();

        continue;
      }

      commandObj.log(
        `\nCreating deal for worker ${color.yellow(workerName)}\n`
      );

      const dealIdOriginal = await dealCreate({
        chainNetwork,
        privKey: flags.privKey,
        appCID,
        minWorkers,
        targetWorkers,
      });

      if (workersConfig.deals === undefined) {
        workersConfig.deals = {};
      }

      workersConfig.deals[workerName] = {
        installation_spells,
        definition: appCID,
        timestamp: new Date().toISOString(),
        dealIdOriginal,
        dealId: dealIdOriginal.slice(2).toLowerCase(),
        chainNetwork,
        chainNetworkId,
      };

      await workersConfig.$commit();

      createdDeals[workerName] = {
        deal: getPolygonScanLink(dealIdOriginal),
        "worker definition": appCID,
      };
    }

    await ensureAquaFileWithWorkerInfo(workersConfig);

    const createdDealsText =
      Object.values(createdDeals).length === 0
        ? ""
        : `\n\n${yamlDiffPatch("", {}, { "created deals": createdDeals })}`;

    const updatedDealsText =
      Object.values(updatedDeals).length === 0
        ? ""
        : `\n\n${yamlDiffPatch("", {}, { "updated deals": updatedDeals })}`;

    if (createdDealsText === "" && updatedDealsText === "") {
      return commandObj.log("No updated or created deals");
    }

    commandObj.log(
      `\n\n${color.yellow("Success!")}${createdDealsText}${updatedDealsText}`
    );
  }
}

const getPolygonScanLink = (dealId: string) =>
  `https://mumbai.polygonscan.com/address/${dealId}`;
