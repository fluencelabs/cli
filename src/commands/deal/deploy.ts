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
import { TARGET_WORKERS_DEFAULT } from "../../lib/configs/project/fluence.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  LOCAL_IPFS_ADDRESS,
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  ENV_FLAG,
  OFF_AQUA_LOGS_FLAG,
  DEAL_CONFIG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
  IMPORT_FLAG,
  NO_BUILD_FLAG,
  TRACING_FLAG,
  MARINE_BUILD_ARGS_FLAG,
  DEFAULT_IPFS_ADDRESS,
  IPFS_ADDR_PROPERTY,
  ENV_FLAG_NAME,
  PRICE_PER_EPOCH_DEFAULT,
} from "../../lib/const.js";
import { dbg } from "../../lib/dbg.js";
import { dealCreate, dealUpdate, match } from "../../lib/deal.js";
import { ensureChainNetwork } from "../../lib/ensureChainNetwork.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { resolveFluenceEnv } from "../../lib/multiaddres.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy workers according to deal in 'deals' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...IMPORT_FLAG,
    ...NO_BUILD_FLAG,
    ...TRACING_FLAG,
    ...MARINE_BUILD_ARGS_FLAG,
    "auto-match": Flags.boolean({
      description:
        "Toggle automatic matching. Auto-matching is turned on by default",
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

    const contractsENV = await ensureChainNetwork(flags.env, fluenceConfig);
    const chainNetworkId = DEAL_CONFIG[contractsENV].id;
    const workersConfig = await initNewWorkersConfig();

    const { ensureAquaFileWithWorkerInfo, prepareForDeploy } = await import(
      "../../lib/deployWorkers.js"
    );

    const fluenceEnv = await resolveFluenceEnv(flags[ENV_FLAG_NAME]);

    const uploadArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      workersConfig,
      fluenceConfig,
      fluenceEnv,
      flags,
    });

    dbg("start connecting to fluence network");
    await initFluenceClient(flags, fluenceConfig);
    await doRegisterIpfsClient(true);
    dbg("start running upload");

    const uploadResult = await upload(
      flags.tracing,
      uploadArg,
      fluenceConfig[IPFS_ADDR_PROPERTY] ??
        (fluenceEnv === "local" ? LOCAL_IPFS_ADDRESS : DEFAULT_IPFS_ADDRESS),
    );

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
      const deal = fluenceConfig.deals?.[workerName];

      assert(
        deal !== undefined,
        "Unreachable. All worker names are checked in prepareForDeploy. Then they are passed to upload aqua function which returns them back without modification",
      );

      const {
        targetWorkers = TARGET_WORKERS_DEFAULT,
        minWorkers = targetWorkers,
        pricePerWorkerEpoch = PRICE_PER_EPOCH_DEFAULT,
        maxWorkersPerProvider = targetWorkers,
        effectors = [],
      } = deal;

      const previouslyDeployedDeal =
        workersConfig.deals?.[fluenceEnv]?.[workerName];

      if (previouslyDeployedDeal !== undefined) {
        commandObj.logToStderr(
          `\nUpdating deal for worker ${color.yellow(workerName)}\n`,
        );

        await dealUpdate({
          contractsENV: contractsENV,
          privKey: flags["priv-key"],
          appCID,
          dealAddress: previouslyDeployedDeal.dealIdOriginal,
        });

        if (flags["auto-match"]) {
          dbg("start matching");

          await match(
            contractsENV,
            flags["priv-key"],
            previouslyDeployedDeal.dealIdOriginal,
          );

          dbg("done matching");
        }

        updatedDeals[workerName] = {
          deal: getLinkToAddress(previouslyDeployedDeal.dealIdOriginal),
          "old worker definition": previouslyDeployedDeal.definition,
          "new worker definition": appCID,
        };

        if (workersConfig.deals === undefined) {
          workersConfig.deals = {};
        }

        let dealsPerEnv = workersConfig.deals[fluenceEnv];

        if (dealsPerEnv === undefined) {
          dealsPerEnv = {};
          workersConfig.deals[fluenceEnv] = dealsPerEnv;
        }

        dealsPerEnv[workerName] = {
          timestamp: new Date().toISOString(),
          definition: appCID,
          chainNetwork: contractsENV,
          chainNetworkId,
          dealIdOriginal: previouslyDeployedDeal.dealIdOriginal,
          dealId: previouslyDeployedDeal.dealId,
        };

        await workersConfig.$commit();

        continue;
      }

      dbg("start deal creation");

      commandObj.logToStderr(
        `\nCreating deal for worker ${color.yellow(workerName)}\n`,
      );

      const dealIdOriginal = await dealCreate({
        contractsENV,
        privKey: flags["priv-key"],
        appCID,
        minWorkers,
        targetWorkers,
        maxWorkersPerProvider,
        pricePerWorkerEpoch,
        effectors,
      });

      if (flags["auto-match"]) {
        dbg("start matching");
        await match(contractsENV, flags["priv-key"], dealIdOriginal);
        dbg("done matching");
      }

      if (workersConfig.deals === undefined) {
        workersConfig.deals = {};
      }

      let dealsPerEnv = workersConfig.deals[fluenceEnv];

      if (dealsPerEnv === undefined) {
        dealsPerEnv = {};
        workersConfig.deals[fluenceEnv] = dealsPerEnv;
      }

      const timestamp = new Date().toISOString();

      dealsPerEnv[workerName] = {
        definition: appCID,
        timestamp,
        dealIdOriginal,
        dealId: dealIdOriginal.slice(2).toLowerCase(),
        chainNetwork: contractsENV,
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

    await ensureAquaFileWithWorkerInfo(
      workersConfig,
      fluenceConfig,
      fluenceEnv,
    );

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
      commandObj.log("No updated or created deals");
      return;
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

async function upload(
  tracing: boolean,
  uploadArg: Upload_deployArgConfig,
  ipfsAddress: string,
) {
  if (tracing) {
    const { upload_deal } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/upload.js"
    );

    return upload_deal(uploadArg, ipfsAddress);
  }

  const { upload_deal } = await import(
    "../../lib/compiled-aqua/installation-spell/upload.js"
  );

  return upload_deal(uploadArg, ipfsAddress);
}
