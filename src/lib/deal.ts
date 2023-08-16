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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import assert from "node:assert";

import { DealClient } from "@fluencelabs/deal-aurora";
import { type ContractsENV } from "@fluencelabs/deal-aurora/dist/client/config.js";
import ethers = require("ethers");
import { CID } from "ipfs-http-client";

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

  const dealClient = new DealClient(signer, chainNetwork);
  const globalContracts = dealClient.getGlobalContracts();

  const factory = await globalContracts.getFactory();
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

  const dealInfo = parseDealInfo(dealInfoEvent);
  return dealInfo.core;
};

function parseDealInfo(dealInfoEvent: ethers.Result): DealInfo {
  const core = dealInfoEvent.getValue("core");
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

  const dealClient = new DealClient(signer, network);
  const deal = dealClient.getDeal(dealAddress);

  const config = await deal.getConfigModule();

  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const tx = await config.setAppCID({
    prefixes: bytesCid.slice(0, 4),
    hash: bytesCid.slice(4),
  });

  await waitTx(tx);

  return tx;
};
