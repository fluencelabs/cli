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

import assert from "assert";

import { DealClient } from "@fluencelabs/deal-aurora";
import { color } from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { FluenceConfig } from "../../lib/configs/project/fluence.js";
import {
  initNewReadonlyProviderConfig,
  promptForOffer,
} from "../../lib/configs/project/provider.js";
import {
  OFFER_FLAG,
  PRIV_KEY_FLAG,
  NOXES_FLAG,
  PROVIDER_CONFIG_FLAGS,
  CURRENCY_MULTIPLIER,
} from "../../lib/const.js";
import { dbg } from "../../lib/dbg.js";
import { ensureChainNetwork } from "../../lib/ensureChainNetwork.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
} from "../../lib/helpers/utils.js";
import { getSecretKeyOrReturnExisting } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";
import { getPeerIdFromSecretKey } from "../../lib/multiaddres.js";
import { getSigner, promptConfirmTx, waitTx } from "../../lib/provider.js";

const CAPACITY_COMMITMENT_CREATED_EVENT = "CapacityCommitmentCreated";
export default class CreateCommitment extends BaseCommand<
  typeof CreateCommitment
> {
  static override aliases = ["provider:cc"];
  static override description = "Create Capacity commitment";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
    ...NOXES_FLAG,
    ...OFFER_FLAG,
    "nox-names": Flags.string({
      description:
        "Comma-separated names of noxes to create capacity commitment for. Default: all noxes in the offer",
    }),
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(CreateCommitment),
    );

    await createCommitment(flags, maybeFluenceConfig);
  }
}

export async function createCommitment(
  flags: {
    offer?: string | undefined;
    noxes?: number | undefined;
    name?: string | undefined;
    env: string | undefined;
    "priv-key": string | undefined;
    "nox-names"?: string | undefined;
  },
  maybeFluenceConfig?: FluenceConfig | null,
) {
  const providerConfig = await initNewReadonlyProviderConfig(flags);

  let offer =
    flags.offer === undefined ? undefined : providerConfig.offers[flags.offer];

  if (offer === undefined) {
    if (flags.offer !== undefined) {
      commandObj.warn(`Offer ${color.yellow(flags.offer)} not found`);
    }

    offer = await promptForOffer(providerConfig.offers);
  }

  const network = await ensureChainNetwork(
    flags.env,
    maybeFluenceConfig ?? null,
  );

  const signer = await getSigner(network, flags["priv-key"]);

  const dealClient = new DealClient(signer, network);
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();

  const minPricePerWorkerEpochBigInt = BigInt(
    offer.minPricePerWorkerEpoch * CURRENCY_MULTIPLIER,
  );

  dbg(`minPricePerWorkerEpoch: ${minPricePerWorkerEpochBigInt}`);

  const [{ digest }, { base58btc }] = await Promise.all([
    import("multiformats"),
    // eslint-disable-next-line import/extensions
    import("multiformats/bases/base58"),
  ]);

  const PRECISION = await core.PRECISION();

  const noxNames =
    flags["nox-names"] === undefined
      ? []
      : commaSepStrToArr(flags["nox-names"]);

  const allComputePeers = Object.entries(providerConfig.computePeers);

  const [unknownNoxNameErrors, computePeersToRegister] = splitErrorsAndResults(
    allComputePeers,
    (computerPeer) => {
      if (noxNames.length === 0) {
        return { result: computerPeer };
      }

      if (noxNames.includes(computerPeer[0])) {
        return { result: computerPeer };
      }

      return {
        error: `Compute peer ${color.yellow(
          computerPeer[0],
        )} is not in the list of noxes in the offer`,
      };
    },
  );

  if (unknownNoxNameErrors.length > 0) {
    commandObj.error(unknownNoxNameErrors.join("\n"));
  }

  for (const [name, computePeer] of computePeersToRegister) {
    commandObj.log(color.gray(`Create capacity commitment for ${name}`));

    const { secretKey } = await getSecretKeyOrReturnExisting(name);
    const peerId = await getPeerIdFromSecretKey(secretKey);

    const peerIdUint8Arr = digest
      .decode(base58btc.decode("z" + peerId))
      .bytes.subarray(6);

    const ccDuration = Math.floor(computePeer.capacityCommitment.duration * 60); //TODO: magic number
    const ccDelegator = computePeer.capacityCommitment.delegator;

    const ccRewardDelegationRate = Math.floor(
      (computePeer.capacityCommitment.rewardDelegationRate / 100) *
        Number(PRECISION),
    );

    promptConfirmTx(flags["priv-key"]);

    const registerPeerTx = await capacity.createCapacityCommitment(
      peerIdUint8Arr,
      ccDuration,
      ccDelegator,
      ccRewardDelegationRate,
    );

    const res = await waitTx(registerPeerTx);
    const event = capacity.getEvent(CAPACITY_COMMITMENT_CREATED_EVENT);

    const log = res.logs.find((log) => {
      if (log.topics[0] !== event.fragment.topicHash) {
        return false;
      }

      return true;
    });

    assert(log !== undefined, "Capacity commitment created event not found.");

    const id: unknown = capacity.interface
      .parseLog({
        topics: [...log.topics],
        data: log.data,
      })
      ?.args.getValue("commitmentId");

    assert(
      typeof id === "string",
      "Capacity commitment created but id not found in the event log",
    );

    commandObj.log(
      color.green(
        `Capacity commitment was created with id ${color.yellow(id)}`,
      ),
    );
  }

  commandObj.log(color.green(`Commitments were registered`));
}
