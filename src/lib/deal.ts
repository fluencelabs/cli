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

import { BigNumber, ethers } from "ethers";

import type { ChainNetwork } from "./const.js";
import {
  GlobalContracts,
  Deal,
  getSigner,
  waitTx,
  promptConfirmTx,
} from "./provider.js";

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

  const globalContracts = new GlobalContracts(signer, chainNetwork);

  const factory = globalContracts.getFactory();

  promptConfirmTx(privKey);

  const tx = await factory.createDeal(
    BigNumber.from(minWorkers),
    BigNumber.from(targetWorkers),
    appCID,
    [] //TODO: get effectors from the project
  );

  const res = await waitTx(tx);

  const eventTopic = factory.interface.getEventTopic(EVENT_TOPIC_FRAGMENT);

  const log = res.logs.find((log: { topics: Array<string> }) => {
    return log.topics[0] === eventTopic;
  });

  assert(
    log !== undefined,
    "DealCreated event not found. Try updating flox to the latest version"
  );

  // TODO: check if this is correct
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const dealInfo: DealInfo =
    factory.interface.parseLog(log).args[DEAL_LOG_ARG_NAME];

  assert(
    ethers.utils.isAddress(dealInfo.core),
    "Deal core address is not valid"
  );

  assert(
    ethers.utils.isAddress(dealInfo.config),
    "Deal config address is not valid"
  );

  assert(
    ethers.utils.isAddress(dealInfo.payment),
    "Deal payment address is not valid"
  );

  assert(
    ethers.utils.isAddress(dealInfo.statusController),
    "Deal status controller address is not valid"
  );

  assert(
    ethers.utils.isAddress(dealInfo.workers),
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
  const deal = new Deal(dealAddress, signer);

  const config = await deal.getConfig();

  promptConfirmTx(privKey);

  const tx = await config.setAppCID(appCID);
  await waitTx(tx);
  return tx;
};
