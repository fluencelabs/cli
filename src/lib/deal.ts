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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import assert from "node:assert";

import type { Matcher } from "@fluencelabs/deal-aurora";
import type { ContractsENV } from "@fluencelabs/deal-aurora/dist/client/config.js";
import { color } from "@oclif/color";
import type { ethers } from "ethers";

import { commandObj } from "./commandObj.js";
import { CLI_NAME_FULL } from "./const.js";
import { getSigner, waitTx, promptConfirmTx } from "./provider.js";

const EVENT_TOPIC_FRAGMENT = "DealCreated";
const DEAL_LOG_ARG_NAME = "deal";

type DealInfo = {
  core: string;
  configModule: string;
  paymentModule: string;
  statusModule: string;
  workersModule: string;
};

type DealCreateArg = {
  chainNetwork: ContractsENV;
  privKey: string | undefined;
  appCID: string;
  minWorkers: number;
  targetWorkers: number;
};

export const dealCreate = async ({
  chainNetwork,
  appCID,
  minWorkers,
  privKey,
  targetWorkers,
}: DealCreateArg) => {
  const signer = await getSigner(chainNetwork, privKey);

  const { DealClient } = await import("@fluencelabs/deal-aurora");
  // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
  const dealClient = new DealClient(signer, chainNetwork);
  const globalContracts = dealClient.getGlobalContracts();

  const factory = await globalContracts.getFactory();
  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const tx = await factory.createDeal(
    minWorkers,
    targetWorkers,
    {
      prefixes: bytesCid.slice(0, 4),
      hash: bytesCid.slice(4),
    },
    [], //TODO: get effectors from the project
  );

  // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
  const res = await waitTx(tx);

  const eventTopic = factory.interface.getEvent(EVENT_TOPIC_FRAGMENT);

  const log = res.logs.find((log) => {
    return log.topics[0] === eventTopic.topicHash;
  });

  assert(
    log !== undefined,
    `DealCreated event not found. Try updating ${CLI_NAME_FULL} to the latest version`,
  );

  const dealInfoEvent: ethers.Result = factory.interface.parseLog({
    data: log.data,
    topics: [...log.topics],
  })?.args[DEAL_LOG_ARG_NAME];

  const dealInfo = await parseDealInfo(dealInfoEvent);
  return dealInfo.core;
};

async function parseDealInfo(dealInfoEvent: ethers.Result): Promise<DealInfo> {
  const core = dealInfoEvent.getValue("core");
  const { ethers } = await import("ethers");
  assert(ethers.isAddress(core), "Deal core address is not valid");

  const configModule = dealInfoEvent.getValue("configModule");

  assert(
    ethers.isAddress(configModule),
    "Deal config module address is not valid",
  );

  const paymentModule = dealInfoEvent.getValue("paymentModule");

  assert(
    ethers.isAddress(paymentModule),
    "Deal payment module address is not valid",
  );

  const statusModule = dealInfoEvent.getValue("statusModule");

  assert(
    ethers.isAddress(statusModule),
    "Deal status module address is not valid",
  );

  const workersModule = dealInfoEvent.getValue("workersModule");

  assert(
    ethers.isAddress(workersModule),
    "Deal workers module address is not valid",
  );

  return {
    core,
    configModule,
    paymentModule,
    statusModule,
    workersModule,
  };
}

type DealUpdateArg = {
  network: ContractsENV;
  privKey: string | undefined;
  dealAddress: string;
  appCID: string;
};

export const dealUpdate = async ({
  network,
  privKey,
  dealAddress,
  appCID,
}: DealUpdateArg) => {
  const signer = await getSigner(network, privKey);
  const { DealClient } = await import("@fluencelabs/deal-aurora");
  // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
  const dealClient = new DealClient(signer, network);
  const deal = dealClient.getDeal(dealAddress);

  const config = await deal.getConfigModule();
  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const tx = await config.setAppCID({
    prefixes: bytesCid.slice(0, 4),
    hash: bytesCid.slice(4),
  });

  // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
  await waitTx(tx);

  return tx;
};

const PAT_CREATED_EVENT_TOPIC = "PATCreated";

export async function match(
  network: ContractsENV,
  privKey: string | undefined,
  dealAddress: string,
) {
  const signer = await getSigner(network, privKey);

  const { DealClient, WorkersModule__factory } = await import(
    "@fluencelabs/deal-aurora"
  );

  // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
  const dealClient = new DealClient(signer, network);
  const globalContracts = dealClient.getGlobalContracts();
  const matcher: Matcher = await globalContracts.getMatcher();
  const tx = await matcher.matchWithDeal(dealAddress);
  promptConfirmTx(privKey);
  // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
  const res = await waitTx(tx);
  const workersInterface = WorkersModule__factory.createInterface();
  const event = workersInterface.getEvent(PAT_CREATED_EVENT_TOPIC);

  const patCount = res.logs.filter((log) => {
    if (log.topics[0] !== event.topicHash) {
      return false;
    }

    const id: unknown = workersInterface
      .parseLog({
        topics: [...log.topics],
        data: log.data,
      })
      ?.args.getValue("id");

    assert(typeof id === "string");
    return true;
  }).length;

  commandObj.logToStderr(
    `${color.yellow(patCount)} workers joined the deal ${color.yellow(
      dealAddress,
    )}`,
  );
}
