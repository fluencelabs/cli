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

import { BigNumber } from "ethers";

import type { ChainNetwork } from "./const.js";
import {
  getFactoryContract,
  getSigner,
  getDealContract,
  waitTx,
  promptConfirmTx,
} from "./provider.js";

const EVENT_TOPIC_FRAGMENT = "DealCreated";
const DEAL_LOG_ARG_NAME = "deal";

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
  const factory = getFactoryContract(signer, chainNetwork);

  promptConfirmTx(privKey);

  const tx = await factory.createDeal(
    BigNumber.from(minWorkers),
    BigNumber.from(targetWorkers),
    appCID
  );

  const res = await waitTx(tx);

  const eventTopic = factory.interface.getEventTopic(EVENT_TOPIC_FRAGMENT);

  const log = res.logs.find(
    (log: { topics: Array<string> }) => log.topics[0] === eventTopic
  );

  assert(log !== undefined);

  const dealAddress: unknown =
    factory.interface.parseLog(log).args[DEAL_LOG_ARG_NAME];

  assert(typeof dealAddress === "string");
  return dealAddress;
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
  const deal = getDealContract(dealAddress, signer);

  promptConfirmTx(privKey);

  const tx = await deal.setAppCID(appCID);
  await waitTx(tx);
  return tx;
};
