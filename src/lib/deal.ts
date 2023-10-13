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

import { Deal__factory, type Matcher } from "@fluencelabs/deal-aurora";
import type { ContractsENV } from "@fluencelabs/deal-aurora/dist/client/config.js";
import { color } from "@oclif/color";
import { ethers } from "ethers";

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
  paymentToken: string;
  collateralPerWorker: number;
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
  paymentToken,
  collateralPerWorker,
  minWorkers,
  targetWorkers,
  maxWorkersPerProvider,
  pricePerWorkerEpoch,
  effectors,
}: DealCreateArg) => {
  const signer = await getSigner(chainNetwork, privKey);

  const { DealClient } = await import("@fluencelabs/deal-aurora");
  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const dealClient = new DealClient(chainNetwork, signer);
  const globalContracts = dealClient.getGlobalContracts();

  const factory = await globalContracts.getFactory();
  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const tx = await factory.deployDeal(
    {
      prefixes: bytesCid.slice(0, 4),
      hash: bytesCid.slice(4),
    },
    paymentToken,
    collateralPerWorker,
    minWorkers,
    targetWorkers,
    maxWorkersPerProvider,
    ethers.parseEther(String(pricePerWorkerEpoch)),
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

  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
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
  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const dealClient = new DealClient(network, signer);
  const deal = dealClient.getDeal(dealAddress);

  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  promptConfirmTx(privKey);

  const tx = await deal.setAppCID({
    prefixes: bytesCid.slice(0, 4),
    hash: bytesCid.slice(4),
  });

  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  await waitTx(tx);

  return tx;
};

const COMPUTE_UNIT_CREATED_EVENT_TOPIC = "ComputeUnitCreated";

export async function match(
  network: ContractsENV,
  privKey: string | undefined,
  dealAddress: string,
) {
  const signer = await getSigner(network, privKey);

  const { DealClient } = await import("@fluencelabs/deal-aurora");

  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const dealClient = new DealClient(network, signer);
  const globalContracts = dealClient.getGlobalContracts();
  const matcher: Matcher = await globalContracts.getMatcher();

  const preMatchingResult = await matcher.findComputePeers(dealAddress);

  const tx = await matcher.matchDeal(
    dealAddress,
    preMatchingResult.computeProviders,
    preMatchingResult.computePeers,
  );

  promptConfirmTx(privKey);
  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const res = await waitTx(tx);
  const dealInterface = Deal__factory.createInterface();
  const event = dealInterface.getEvent(COMPUTE_UNIT_CREATED_EVENT_TOPIC);

  const patCount = res.logs.filter((log) => {
    if (log.topics[0] !== event.topicHash) {
      return false;
    }

    const id: unknown = dealInterface
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
