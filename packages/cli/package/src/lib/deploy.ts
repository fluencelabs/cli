/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import assert from "node:assert";

import type { DealStatus } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import { Flags } from "@oclif/core";

import { baseFlags } from "../baseCommand.js";
import type Deploy from "../commands/deploy.js";

import { getChainId } from "./chain/chainConfig.js";
import { printDealInfo } from "./chain/printDealInfo.js";
import { commandObj } from "./commandObj.js";
import type { Upload_deployArgConfig } from "./compiled-aqua/installation-spell/cli.js";
import { TARGET_WORKERS_DEFAULT } from "./configs/project/fluence.js";
import {
  initNewWorkersConfig,
  type Deal,
  type WorkersConfigReadonly,
} from "./configs/project/workers.js";
import {
  LOCAL_IPFS_ADDRESS,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  NO_BUILD_FLAG,
  MARINE_BUILD_ARGS_FLAG,
  DEFAULT_IPFS_ADDRESS,
  IPFS_ADDR_PROPERTY,
  DEFAULT_PRICE_PER_CU_PER_EPOCH_DEVELOPER,
  CHAIN_FLAGS,
  DEPLOYMENT_NAMES_ARG_NAME,
  IMPORT_FLAG,
} from "./const.js";
import { dbg } from "./dbg.js";
import { dealCreate, dealUpdate, match } from "./deal.js";
import { createAndMatchDealsForPeerIds } from "./deal.js";
import { getReadonlyContracts } from "./dealClient.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import { numToStr } from "./helpers/typesafeStringify.js";
import { stringifyUnknown } from "./helpers/utils.js";
import { disconnectFluenceClient } from "./jsClient.js";
import { initCli } from "./lifeCycle.js";
import { getIpfsClient } from "./localServices/ipfs.js";
import { confirm } from "./prompt.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

export const DEPLOY_DESCRIPTION = `Deploy according to 'deployments' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
export const DEPLOY_EXAMPLES = ["<%= config.bin %> <%= command.id %>"];

export const DEPLOY_FLAGS = {
  ...baseFlags,
  ...CHAIN_FLAGS,
  ...IMPORT_FLAG,
  ...NO_BUILD_FLAG,
  ...MARINE_BUILD_ARGS_FLAG,
  update: Flags.boolean({
    char: "u",
    description: "Update your previous deployment",
    default: false,
  }),
  "peer-ids": Flags.string({
    description:
      "Comma separated list of peer ids to deploy to. Creates 1 worker for each peer with 'cuCountPerWorker' number of compute units",
  }),
};

type DealState =
  | "notCreated"
  | "notMatched"
  | "matched"
  | "ended"
  | "notEnoughWorkers";

export async function deployImpl(this: Deploy, cl: typeof Deploy) {
  const { flags, args } = await initCli(this, await this.parse(cl), true);
  const fluenceConfig = await ensureFluenceProject();
  const chainNetworkId = await getChainId();
  const workersConfig = await initNewWorkersConfig();

  const { ensureAquaFileWithWorkerInfo, prepareForDeploy } = await import(
    "./deployWorkers.js"
  );

  const fluenceEnv = await ensureFluenceEnv();

  const uploadArg = await prepareForDeploy({
    deploymentNamesString: args[DEPLOYMENT_NAMES_ARG_NAME],
    fluenceEnv,
    flags,
  });

  dbg("start running upload");

  const uploadResult = await upload(
    uploadArg,
    fluenceConfig[IPFS_ADDR_PROPERTY] ??
      (fluenceEnv === "local" ? LOCAL_IPFS_ADDRESS : DEFAULT_IPFS_ADDRESS),
  );

  for (const {
    name: deploymentName,
    definition: appCID,
  } of uploadResult.workers) {
    const deal = fluenceConfig.deployments?.[deploymentName];

    assert(
      deal !== undefined,
      "Unreachable. All deployment names are checked in prepareForDeploy. Then they are passed to upload aqua function which returns them back without modification",
    );

    const {
      targetWorkers = TARGET_WORKERS_DEFAULT,
      minWorkers = targetWorkers,
      effectors = [],
      pricePerCuPerEpoch = DEFAULT_PRICE_PER_CU_PER_EPOCH_DEVELOPER,
      maxWorkersPerProvider = targetWorkers,
      cuCountPerWorker = 1,
    } = deal;

    let createdDeal = workersConfig.deals?.[fluenceEnv]?.[deploymentName];

    let dealState = await determineDealState(
      createdDeal,
      deploymentName,
      workersConfig,
    );

    const isDealUpdate =
      dealState !== "notCreated" && appCID !== createdDeal?.definition;

    if (isDealUpdate) {
      assert(
        createdDeal !== undefined,
        "Unreachable. isDealUpdate can be true only if createdDeal !== undefined",
      );

      if (!flags.update) {
        commandObj.logToStderr(
          `\n${color.yellow(
            deploymentName,
          )} deal is already created. You can use ${color.yellow(
            "--update",
          )} flag to update what you created previously\n`,
        );

        continue;
      }

      commandObj.logToStderr(
        `\nUpdating deal for ${color.yellow(deploymentName)}\n`,
      );

      await dealUpdate({
        appCID,
        dealAddress: createdDeal.dealIdOriginal,
      });

      if (workersConfig.deals === undefined) {
        workersConfig.deals = {};
      }

      let dealsPerEnv = workersConfig.deals[fluenceEnv];

      if (dealsPerEnv === undefined) {
        dealsPerEnv = {};
        workersConfig.deals[fluenceEnv] = dealsPerEnv;
      }

      dealsPerEnv[deploymentName] = {
        timestamp: new Date().toISOString(),
        definition: appCID,
        chainNetworkId,
        dealIdOriginal: createdDeal.dealIdOriginal,
        dealId: createdDeal.dealId,
      };

      await workersConfig.$commit();

      commandObj.logToStderr(
        `\n${color.yellow(
          deploymentName,
        )} deal updated.\nOld worker definition: ${color.yellow(
          createdDeal.definition,
        )}\nNew worker definition: ${color.yellow(appCID)}\n`,
      );
    }

    if (dealState === "matched") {
      commandObj.logToStderr(
        `\nDeal ${color.yellow(
          deploymentName,
        )} already created and matched. Skipping...\n`,
      );
    }

    const dealCreateArgs = {
      appCID,
      minWorkers,
      targetWorkers,
      maxWorkersPerProvider,
      pricePerCuPerEpoch,
      cuCountPerWorker,
      effectors,
      deploymentName,
      initialBalance: deal.initialBalance,
      whitelist: deal.whitelist,
      blacklist: deal.blacklist,
      protocolVersion: deal.protocolVersion,
    } as const;

    // if peer-ids flag is used we create a deal for each CU of the peer
    if (dealState === "notCreated" && flags["peer-ids"] !== undefined) {
      dealState = "notMatched";
    }

    if (dealState === "notCreated" && flags["peer-ids"] === undefined) {
      if (flags.update) {
        commandObj.logToStderr(
          `\nSkipping ${color.yellow(
            deploymentName,
          )} deal update because it is not yet created. You can create it if you remove --update flag\n`,
        );

        continue;
      }

      commandObj.logToStderr(
        `\nCreating ${color.yellow(deploymentName)} deal\n`,
      );

      const dealIdOriginal = await dealCreate(dealCreateArgs);

      if (workersConfig.deals === undefined) {
        workersConfig.deals = {};
      }

      let dealsPerEnv = workersConfig.deals[fluenceEnv];

      if (dealsPerEnv === undefined) {
        dealsPerEnv = {};
        workersConfig.deals[fluenceEnv] = dealsPerEnv;
      }

      const timestamp = new Date().toISOString();

      createdDeal = {
        definition: appCID,
        timestamp,
        dealIdOriginal,
        dealId: dealIdOriginal.slice(2).toLowerCase(),
        chainNetworkId,
        matched: false,
      };

      dealsPerEnv[deploymentName] = createdDeal;
      await workersConfig.$commit();
      dealState = "notMatched";

      commandObj.logToStderr(
        `\n${color.yellow(
          deploymentName,
        )} deal created. Deal id: ${color.yellow(
          createdDeal.dealIdOriginal,
        )}\n`,
      );
    }

    if (dealState === "notMatched" || dealState === "notEnoughWorkers") {
      try {
        if (flags["peer-ids"] !== undefined) {
          await createAndMatchDealsForPeerIds({
            ...dealCreateArgs,
            peerIdsFromFlags: flags["peer-ids"],
          });
        } else {
          assert(
            createdDeal !== undefined,
            "Unreachable. createdDeal can't be undefined",
          );

          await match(createdDeal.dealIdOriginal);
          createdDeal.matched = true;
          await workersConfig.$commit();
          dealState = "matched";

          commandObj.logToStderr(
            `\n${color.yellow(
              deploymentName,
            )} deal matched. Deal id: ${color.yellow(
              createdDeal.dealIdOriginal,
            )}\n`,
          );
        }
      } catch (e) {
        commandObj.logToStderr(
          `Was not able to match deal for deployment ${color.yellow(
            deploymentName,
          )} ${stringifyUnknown(e)}`,
        );
      }
    }

    if (createdDeal !== undefined) {
      await printDealInfo({
        dealId: createdDeal.dealIdOriginal,
        dealName: deploymentName,
      });
    }
  }

  await ensureAquaFileWithWorkerInfo();

  commandObj.log(
    `\n\nUse ${color.yellow(
      "fluence deal info",
    )} command to get info about your deals\nUse ${color.yellow(
      "fluence deal deposit",
    )} command to top up your deals\nUse ${color.yellow(
      "fluence deal --help",
    )} to see all the commands related to deals`,
  );

  await disconnectFluenceClient();
}

async function getDealStatus(dealId: string) {
  const { DealStatus } = await import("@fluencelabs/deal-ts-clients");
  const { readonlyContracts } = await getReadonlyContracts();
  const deal = readonlyContracts.getDeal(dealId);
  const status = Number(await deal.getStatus());

  function isDealStatus(status: number): status is DealStatus {
    return status in DealStatus;
  }

  assert(isDealStatus(status), `Unknown deal status: ${numToStr(status)}`);
  return status;
}

async function determineDealState(
  createdDeal: Deal | undefined,
  workerName: string,
  workersConfig: WorkersConfigReadonly,
): Promise<DealState> {
  if (createdDeal === undefined) {
    return "notCreated";
  }

  if (createdDeal.matched === false) {
    return "notMatched";
  }

  const status = await getDealStatus(createdDeal.dealIdOriginal);
  const { DealStatus } = await import("@fluencelabs/deal-ts-clients");
  const isDealEnded = status === DealStatus.ENDED;

  if (
    isDealEnded &&
    (await confirm({
      message: `You previously deployed ${color.yellow(
        workerName,
      )}, but this deal is already ended (at ${workersConfig.$getPath()})\n\nPlease keep this deal id ${color.yellow(
        createdDeal.dealIdOriginal,
      )} to withdraw the money from it after state overwrite\n\nDo you want to create a new deal and overwrite the old one`,
      default: true,
    }))
  ) {
    return "notCreated";
  }

  if (status === DealStatus.NOT_ENOUGH_WORKERS) {
    return "notEnoughWorkers";
  }

  return isDealEnded ? "ended" : "matched";
}

async function upload(config: Upload_deployArgConfig, ipfsAddress: string) {
  const deployDefs = await Promise.all(
    config.workers.map(async (w) => {
      const definitionCID = await uploadWorkerConfig(ipfsAddress, w.config);
      return {
        name: w.name,
        hosts: w.hosts,
        definition: definitionCID,
        dummy_deal_id: w.dummy_deal_id,
      };
    }),
  );

  return {
    installation_script: config.installation_script,
    installation_trigger: config.installation_trigger,
    workers: deployDefs,
  };
}

async function uploadWorkerConfig(
  ipfs: string,
  config: Upload_deployArgConfig["workers"][number]["config"],
) {
  const ipfsClient = getIpfsClient();

  const services = await Promise.all(
    config.services.map(async ({ name, total_memory_limit, modules }) => {
      return {
        name,
        total_memory_limit,
        modules: await Promise.all(
          modules.map(async ({ name, wasm }) => {
            return { name, wasm: await ipfsClient.upload(ipfs, wasm) };
          }),
        ),
      };
    }),
  );

  const spells = await Promise.all(
    config.spells.map(async (sp) => {
      const script = await ipfsClient.upload_string(ipfs, sp.script);
      const cfg_str = JSON.stringify(sp.config);
      const config = await ipfsClient.upload_string(ipfs, cfg_str);
      const init_args_str = JSON.stringify(sp.init_args);
      const init_args = await ipfsClient.upload_string(ipfs, init_args_str);
      return { name: sp.name, script, config, init_args };
    }),
  );

  return ipfsClient.upload_string(ipfs, JSON.stringify({ services, spells }));
}
