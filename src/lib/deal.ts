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

import { DealClient } from "@fluencelabs/deal-aurora";
import { color } from "@oclif/color";
import type { ethers } from "ethers";

import { commandObj } from "./commandObj.js";
import { CLI_NAME_FULL, CURRENCY_MULTIPLIER, type Network } from "./const.js";
import { dbg } from "./dbg.js";
import { getSigner, waitTx, promptConfirmTx } from "./provider.js";

const EVENT_TOPIC_FRAGMENT = "DealCreated";
const DEAL_LOG_ARG_NAME = "deal";

type DealCreateArg = {
  chainNetwork: Network;
  privKey: string | undefined;
  appCID: string;
  minWorkers: number;
  targetWorkers: number;
  maxWorkersPerProvider: number;
  pricePerWorkerEpoch: number;
  effectors: string[];
};

export const dealCreate = async ({
  chainNetwork,
  privKey,
  appCID,
  minWorkers,
  targetWorkers,
  maxWorkersPerProvider,
  pricePerWorkerEpoch,
  effectors,
}: DealCreateArg) => {
  const signer = await getSigner(chainNetwork, privKey);

  const dealClient = new DealClient(signer, chainNetwork);
  const core = await dealClient.getCore();
  const flt = await dealClient.getFLT();

  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const pricePerWorkerEpochBigInt = BigInt(
    pricePerWorkerEpoch * CURRENCY_MULTIPLIER,
  );

  dbg(`pricePerWorkerEpoch: ${pricePerWorkerEpochBigInt}`);

  const approveTx = await flt.approve(
    await core.getAddress(),
    BigInt(targetWorkers) * pricePerWorkerEpochBigInt * await core.minDealDepositedEpoches(),
  );


  await waitTx(approveTx);
  promptConfirmTx(privKey);

  const tx = await core.deployDeal(
    {
      prefixes: bytesCid.slice(0, 4),
      hash: bytesCid.slice(4),
    },
    await flt.getAddress(),
    minWorkers,
    targetWorkers,
    maxWorkersPerProvider,
    pricePerWorkerEpochBigInt,
    effectors.map((effectorHash) => {
      const id = CID.parse(effectorHash).bytes;
      return {
        prefixes: id.slice(0, 4),
        hash: id.slice(4),
      };
    }),
    0,
    [],
  );


  const res = await waitTx(tx);

  const eventTopic = core.interface.getEvent(EVENT_TOPIC_FRAGMENT);

  const log = res.logs.find((log) => {
    return log.topics[0] === eventTopic.topicHash;
  });

  assert(
    log !== undefined,
    `DealCreated event not found. Try updating ${CLI_NAME_FULL} to the latest version`,
  );

  const dealInfoEvent: ethers.Result = core.interface
    .parseLog({
      data: log.data,
      topics: [...log.topics],
    })
    ?.args.getValue(DEAL_LOG_ARG_NAME);

  return dealInfoEvent.toString();
};

type DealUpdateArg = {
  network: Network;
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

  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const tx = await deal.setAppCID({
    prefixes: bytesCid.slice(0, 4),
    hash: bytesCid.slice(4),
  });


  await waitTx(tx);

  return tx;
};

const COMPUTE_UNIT_CREATED_EVENT_TOPIC = "ComputeUnitCreated";

export async function match(
  network: Network,
  privKey: string | undefined,
  dealAddress: string,
) {
  const signer = await getSigner(network, privKey);

  const dealClient = new DealClient(signer, network);
  const core = await dealClient.getCore();

  const tx = await core.matchDeal(
    dealAddress
  );

  promptConfirmTx(privKey);

  const res = await waitTx(tx);
  const event = core.getEvent(COMPUTE_UNIT_CREATED_EVENT_TOPIC);

  const patCount = res.logs.filter((log) => {
    if (log.topics[0] !== event.fragment.topicHash) {
      return false;
    }

    const id: unknown = core.interface
      .parseLog({
        topics: [...log.topics],
        data: log.data,
      })
      ?.args.getValue("unitId");

    assert(typeof id === "string");
    return true;
  }).length;

  commandObj.logToStderr(
    `${color.yellow(patCount)} workers joined the deal ${color.yellow(
      dealAddress,
    )}`,
  );
}
