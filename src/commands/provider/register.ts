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
import { ethers } from "ethers";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { FluenceConfig } from "../../lib/configs/project/fluence.js";
import {
  initNewReadonlyProviderConfig,
  type Offer,
  type ProviderConfigReadonly,
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
import { getSecretKeyOrReturnExisting } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";
import { getPeerIdFromSecretKey } from "../../lib/multiaddres.js";
import { list, type Choices } from "../../lib/prompt.js";
import { getSigner, promptConfirmTx, waitTx } from "../../lib/provider.js";

const CAPACITY_COMMITMENT_CREATED_EVENT = "CapacityCommitmentCreated";
export default class Register extends BaseCommand<typeof Register> {
  static override description = "Register in matching contract";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
    ...NOXES_FLAG,
    ...OFFER_FLAG,
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Register),
    );

    await register(flags, maybeFluenceConfig);
  }
}

export async function register(
  flags: {
    offer?: string | undefined;
    noxes?: number | undefined;
    name?: string | undefined;
    env: string | undefined;
    "priv-key": string | undefined;
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
  const market = await dealClient.getMarket();
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();
  const flt = await dealClient.getFLT();

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

  const computePeersToRegister = await Promise.all(
    Object.entries(providerConfig.computePeers).map(
      async ([name, computePeer]) => {
        const { secretKey } = await getSecretKeyOrReturnExisting(name);
        const peerId = await getPeerIdFromSecretKey(secretKey);

        return {
          name,
          peerId,
          peerIdUint8Arr: digest
            .decode(base58btc.decode("z" + peerId))
            .bytes.subarray(6),
          unitCount: computePeer.computeUnits,
          owner: ethers.ZeroAddress, //TODO: get owner for peer,
          ccDuration: Math.floor(computePeer.capacityCommitment.duration * 60), //TODO: magic number
          ccDelegator: computePeer.capacityCommitment.delegator,
          ccRewardDelegationRate: Math.floor(
            (computePeer.capacityCommitment.rewardDelegationRate / 100) *
              Number(PRECISION),
          ),
        };
      },
    ),
  );

  //TODO: if offer exists, update it
  const registerOfferTx = await market.registerMarketOffer(
    minPricePerWorkerEpochBigInt,
    await flt.getAddress(),
    // offer.effectors!.map((effector) => {
    //   const bytesCid = CID.parse(effector).bytes;

    //   return {
    //     prefixes: bytesCid.slice(0, 4),
    //     hash: bytesCid.slice(4),
    //   };
    // })
    [],
    computePeersToRegister.map((peer) => {
      return {
        peerId: peer.peerIdUint8Arr,
        unitIds: new Array(peer.unitCount).fill(0).map(() => {
          return ethers.randomBytes(32);
        }),
        owner: peer.owner,
      };
    }),
  );

  promptConfirmTx(flags["priv-key"]);
  await waitTx(registerOfferTx);

  for (const peer of computePeersToRegister) {
    commandObj.log(color.gray(`Create capacity commitment for ${peer.name}`));

    promptConfirmTx(flags["priv-key"]);

    const registerPeerTx = await capacity.createCapacityCommitment(
      peer.peerIdUint8Arr,
      peer.ccDuration,
      peer.ccDelegator,
      peer.ccRewardDelegationRate,
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

  commandObj.log(color.green(`Offer and commitments were registered`));
}

function promptForOffer(offers: ProviderConfigReadonly["offers"]) {
  const options: Choices<Offer> = Object.entries(offers).map(
    ([name, offer]) => {
      return {
        name,
        value: offer,
      };
    },
  );

  return list({
    message: "Select offer",
    options,
    oneChoiceMessage(choice) {
      return `Select offer ${color.yellow(choice)}`;
    },
    onNoChoices() {
      commandObj.error("No offers found");
    },
  });
}
