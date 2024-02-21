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

import { baseFlags } from "../baseCommand.js";
import type Deploy from "../commands/deploy.js";

import { commandObj } from "./commandObj.js";
import type { Upload_deployArgConfig } from "./compiled-aqua/installation-spell/cli.js";
import { TARGET_WORKERS_DEFAULT } from "./configs/project/fluence.js";
import { initNewWorkersConfig } from "./configs/project/workers.js";
import {
  LOCAL_IPFS_ADDRESS,
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
  DEFAULT_INITIAL_BALANCE,
  PRICE_PER_EPOCH_DEFAULT,
  CHAIN_FLAGS,
  type ChainENV,
} from "./const.js";
import { dbg } from "./dbg.js";
import { dealCreate, dealUpdate, match } from "./deal.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import { disconnectFluenceClient, initFluenceClient } from "./jsClient.js";
import { initCli } from "./lifeCycle.js";
import { doRegisterIpfsClient } from "./localServices/ipfs.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

export const DEPLOY_DESCRIPTION = `Deploy according to 'deployments' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
export const DEPLOY_EXAMPLES = ["<%= config.bin %> <%= command.id %>"];

export const DEPLOY_FLAGS = {
  ...baseFlags,
  ...OFF_AQUA_LOGS_FLAG,
  ...CHAIN_FLAGS,
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

export const DEPLOY_ARGS = {
  "DEPLOYMENT-NAMES": Args.string({
    description: `Comma separated names of deployments to deploy. Example: "deployment1,deployment2" (by default all deployments from 'deployments' property in ${FLUENCE_CONFIG_FULL_FILE_NAME} are deployed)`,
  }),
};

export async function deployImpl(this: Deploy, cl: typeof Deploy) {
  const { flags, fluenceConfig, args } = await initCli(
    this,
    await this.parse(cl),
    true,
  );

  const chainEnv = await ensureChainEnv();
  const chainNetworkId = DEAL_CONFIG[chainEnv].id;
  const workersConfig = await initNewWorkersConfig();

  const { ensureAquaFileWithWorkerInfo, prepareForDeploy } = await import(
    "./deployWorkers.js"
  );

  const fluenceEnv = await ensureFluenceEnv();

  const uploadArg = await prepareForDeploy({
    workerNames: args["DEPLOYMENT-NAMES"],
    workersConfig,
    fluenceConfig,
    fluenceEnv,
    flags,
  });

  dbg("start connecting to fluence network");
  await initFluenceClient(flags);
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

  for (const { name: workerName, definition: appCID } of uploadResult.workers) {
    const deal = fluenceConfig.deployments?.[workerName];

    assert(
      deal !== undefined,
      "Unreachable. All deployment names are checked in prepareForDeploy. Then they are passed to upload aqua function which returns them back without modification",
    );

    const {
      targetWorkers = TARGET_WORKERS_DEFAULT,
      minWorkers = targetWorkers,
      effectors = [],
      pricePerWorkerEpoch = PRICE_PER_EPOCH_DEFAULT,
      maxWorkersPerProvider = targetWorkers,
    } = deal;

    const previouslyDeployedDeal =
      workersConfig.deals?.[fluenceEnv]?.[workerName];

    if (previouslyDeployedDeal !== undefined) {
      commandObj.logToStderr(
        `\nUpdating deal for ${color.yellow(workerName)}\n`,
      );

      await dealUpdate({
        appCID,
        dealAddress: previouslyDeployedDeal.dealIdOriginal,
      });

      updatedDeals[workerName] = {
        deal: getLinkToAddress(previouslyDeployedDeal.dealIdOriginal, chainEnv),
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
        chainNetwork: chainEnv,
        chainNetworkId,
        dealIdOriginal: previouslyDeployedDeal.dealIdOriginal,
        dealId: previouslyDeployedDeal.dealId,
      };

      await workersConfig.$commit();

      continue;
    }

    commandObj.logToStderr(`\nDeploying ${color.yellow(workerName)}\n`);

    const dealIdOriginal = await dealCreate({
      appCID,
      minWorkers,
      targetWorkers,
      maxWorkersPerProvider,
      pricePerWorkerEpoch,
      effectors,
      workerName,
      initialBalance: deal.initialBalance ?? DEFAULT_INITIAL_BALANCE,
    });

    if (flags["auto-match"]) {
      await match(dealIdOriginal);
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
      chainNetwork: chainEnv,
      chainNetworkId,
    };

    await workersConfig.$commit();

    createdDeals[workerName] = {
      deal: getLinkToAddress(dealIdOriginal, chainEnv),
      "worker definition": appCID,
      timestamp,
    };
  }

  dbg("start creating aqua files with worker info");

  await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig, fluenceEnv);

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

function getLinkToAddress(dealId: string, contractsENV: ChainENV) {
  return contractsENV === "local"
    ? dealId
    : `https://mumbai.polygonscan.com/address/${dealId}`;
}

async function upload(
  tracing: boolean,
  uploadArg: Upload_deployArgConfig,
  ipfsAddress: string,
) {
  if (tracing) {
    const { upload_deal } = await import(
      "./compiled-aqua-with-tracing/installation-spell/upload.js"
    );

    return upload_deal(uploadArg, ipfsAddress);
  }

  const { upload_deal } = await import(
    "./compiled-aqua/installation-spell/upload.js"
  );

  return upload_deal(uploadArg, ipfsAddress);
}
