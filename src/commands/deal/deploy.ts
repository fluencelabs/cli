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

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Upload_deployArgConfig } from "../../lib/compiled-aqua/installation-spell/cli.js";
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
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
  IMPORT_FLAG,
  NO_BUILD_FLAG,
  TRACING_FLAG,
  MARINE_BUILD_ARGS_FLAG,
} from "../../lib/const.js";
import { dbg } from "../../lib/dbg.js";
import { dealCreate, dealUpdate, match } from "../../lib/deal.js";
import { ensureAquaImports } from "../../lib/helpers/aquaImports.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { ensureChainNetwork } from "../../lib/provider.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy workers according to deal in 'deals' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...IMPORT_FLAG,
    ...NO_BUILD_FLAG,
    ...TRACING_FLAG,
    ...MARINE_BUILD_ARGS_FLAG,
    "auto-match": Flags.boolean({
      description: `Disable automatic matching`,
      allowNo: true,
      default: true,
    }),
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Comma separated names of workers to deploy. Example: "worker1,worker2" (by default all workers from 'deals' property in ${FLUENCE_CONFIG_FULL_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Deploy),
      true,
    );

    const chainNetwork = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const chainNetworkId = DEAL_CONFIG[chainNetwork].chainId;
    const workersConfig = await initNewWorkersConfig();

    const aquaImports = await ensureAquaImports({
      maybeFluenceConfig: fluenceConfig,
      flags,
    });

    const { ensureAquaFileWithWorkerInfo, prepareForDeploy } = await import(
      "../../lib/deployWorkers.js"
    );

    const uploadArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      maybeWorkersConfig: workersConfig,
      fluenceConfig,
      aquaImports,
      noBuild: flags["no-build"],
      marineBuildArgs: flags["marine-build-args"],
    });

    dbg("start connecting to fluence network");
    await initFluenceClient(flags, fluenceConfig);
    await doRegisterIpfsClient(true);
    dbg("start running upload");

    const uploadResult = await upload(flags.tracing, uploadArg);

    const createdDeals: Record<
      string,
      { deal: string; "worker definition": string; timestamp: string }
    > = {};

    const updatedDeals: Record<
      string,
      {
        deal: string;
        "old worker definition": string;
        "new worker definition": string;
      }
    > = {};

    for (const {
      name: workerName,
      definition: appCID,
    } of uploadResult.workers) {
      const deal = fluenceConfig?.deals?.[workerName];
      assert(deal !== undefined);
      const { minWorkers = MIN_WORKERS, targetWorkers = TARGET_WORKERS } = deal;

      const maybePreviouslyDeployedDeal = workersConfig.deals?.[workerName];

      if (maybePreviouslyDeployedDeal !== undefined) {
        if (maybePreviouslyDeployedDeal.definition === appCID) {
          commandObj.logToStderr(
            `\nWorker ${color.yellow(
              workerName,
            )} didn't change. Skipping deal update`,
          );

          continue;
        }

        commandObj.logToStderr(
          `\nUpdating deal for worker ${color.yellow(workerName)}\n`,
        );

        await dealUpdate({
          network: chainNetwork,
          privKey: flags["priv-key"],
          appCID,
          dealAddress: maybePreviouslyDeployedDeal.dealId,
        });

        if (flags["auto-match"]) {
          dbg("start matching");

          await match(
            chainNetwork,
            flags["priv-key"],
            maybePreviouslyDeployedDeal.dealIdOriginal,
          );

          dbg("done matching");
        }

        updatedDeals[workerName] = {
          deal: getLinkToAddress(maybePreviouslyDeployedDeal.dealIdOriginal),
          "old worker definition": maybePreviouslyDeployedDeal.definition,
          "new worker definition": appCID,
        };

        if (workersConfig.deals === undefined) {
          workersConfig.deals = {};
        }

        workersConfig.deals[workerName] = {
          timestamp: new Date().toISOString(),
          definition: appCID,
          chainNetwork,
          chainNetworkId,
          dealIdOriginal: maybePreviouslyDeployedDeal.dealIdOriginal,
          dealId: maybePreviouslyDeployedDeal.dealId,
        };

        await workersConfig.$commit();

        continue;
      }

      dbg("start deal creation");

      commandObj.logToStderr(
        `\nCreating deal for worker ${color.yellow(workerName)}\n`,
      );

      const dealIdOriginal = await dealCreate({
        chainNetwork,
        privKey: flags["priv-key"],
        appCID,
        minWorkers,
        targetWorkers,
      });

      if (flags["auto-match"]) {
        dbg("start matching");
        await match(chainNetwork, flags["priv-key"], dealIdOriginal);
        dbg("done matching");
      }

      if (workersConfig.deals === undefined) {
        workersConfig.deals = {};
      }

      const timestamp = new Date().toISOString();

      workersConfig.deals[workerName] = {
        definition: appCID,
        timestamp,
        dealIdOriginal,
        dealId: dealIdOriginal.slice(2).toLowerCase(),
        chainNetwork,
        chainNetworkId,
      };

      await workersConfig.$commit();

      createdDeals[workerName] = {
        deal: getLinkToAddress(dealIdOriginal),
        "worker definition": appCID,
        timestamp,
      };
    }

    dbg("start creating aqua files with worker info");
    await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig);
    const { yamlDiffPatch } = await import("yaml-diff-patch");

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
      `\n\n${color.yellow("Success!")}${createdDealsText}${updatedDealsText}`,
    );

    await disconnectFluenceClient();
  }
}

const getLinkToAddress = (dealId: string) => {
  return `https://mumbai.polygonscan.com/address/${dealId}`;
};

async function upload(tracing: boolean, uploadArg: Upload_deployArgConfig) {
  if (tracing) {
    const { upload } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/upload.js"
    );

    return upload(uploadArg);
  }

  const { upload } = await import(
    "../../lib/compiled-aqua/installation-spell/upload.js"
  );

  return upload(uploadArg);
}
