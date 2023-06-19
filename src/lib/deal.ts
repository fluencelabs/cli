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

import { DealClient } from "@fluencelabs/deal-client";
import { ethers } from "ethers";

import type { ChainNetwork } from "./const.js";
import { getSigner, waitTx, promptConfirmTx } from "./provider.js";

const EVENT_TOPIC_FRAGMENT = "DealCreated";
const DEAL_LOG_ARG_NAME = "deal";

type DealInfo = {
  core: string;
  config: string;
  controller: string;
  payment: string;
  statusController: string;
  workers: string;
};

type DealCreateArg = {
  chainNetwork: ChainNetwork;
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

  const factory = globalContracts.getFactory();

  promptConfirmTx(privKey);

  const tx = await factory.createDeal(
    minWorkers,
    targetWorkers,
    appCID,
    [] //TODO: get effectors from the project
  );

  const res = await waitTx(tx);

  const eventTopic = factory.interface.getEvent(EVENT_TOPIC_FRAGMENT);

  const log = res.logs.find((log: ethers.Log) => {
    return log.topics[0] === eventTopic;
  });

  assert(
    log !== undefined,
    "DealCreated event not found. Try updating flox to the latest version"
  );

  // TODO: check if this is correct
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const dealInfo: DealInfo =
    factory.interface.parseLog(log)?.args[DEAL_LOG_ARG_NAME];

  assert(ethers.isAddress(dealInfo.core), "Deal core address is not valid");

  assert(ethers.isAddress(dealInfo.config), "Deal config address is not valid");

  assert(
    ethers.isAddress(dealInfo.controller),
    "Deal controller address is not valid"
  );

  assert(
    ethers.isAddress(dealInfo.payment),
    "Deal payment address is not valid"
  );

  assert(
    ethers.isAddress(dealInfo.statusController),
    "Deal status controller address is not valid"
  );

  assert(
    ethers.isAddress(dealInfo.workers),
    "Deal workers address is not valid"
  );

  return dealInfo.core;
};

type DealUpdateArg = {
  network: ChainNetwork;
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

  promptConfirmTx(privKey);

  const tx = await config.setAppCID(appCID);
  await waitTx(tx);
  return tx;
};
