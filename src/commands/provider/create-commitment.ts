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

import { color } from "@oclif/color";
import { Flags } from "@oclif/core";
import parse from "parse-duration";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initNewReadonlyProviderConfig } from "../../lib/configs/project/provider.js";
import {
  PRIV_KEY_FLAG,
  NOXES_FLAG,
  PROVIDER_CONFIG_FLAGS,
} from "../../lib/const.js";
import {
  getDealClient,
  promptConfirmTx,
  waitTx,
} from "../../lib/dealClient.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
} from "../../lib/helpers/utils.js";
import { getSecretKeyOrReturnExisting } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";
import { getPeerIdFromSecretKey } from "../../lib/multiaddres.js";

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
    "nox-names": Flags.string({
      description:
        "Comma-separated names of noxes to create capacity commitment for. Default: all noxes from capacityCommitments property of the provider config",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CreateCommitment));
    await createCommitment(flags);
  }
}

export async function createCommitment(flags: {
  noxes?: number | undefined;
  config?: string | undefined;
  env: string | undefined;
  "priv-key": string | undefined;
  "nox-names"?: string | undefined;
}) {
  const { dealClient } = await getDealClient();
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();

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

  const providerConfig = await initNewReadonlyProviderConfig(flags);

  const allCommitments = Object.entries(
    providerConfig.capacityCommitments ?? {},
  );

  if (allCommitments.length === 0) {
    commandObj.error(
      `No capacity commitments found at ${color.yellow(
        providerConfig.$getPath(),
      )}`,
    );
  }

  const [unknownNoxNameErrors, computePeersToRegister] =
    noxNames.length === 0
      ? [[], allCommitments]
      : splitErrorsAndResults(allCommitments, (result) => {
          const [name] = result;

          if (noxNames.includes(name)) {
            return { result };
          }

          return {
            error: `Compute peer ${color.yellow(
              name,
            )} is not in the list of noxes in the offer`,
          };
        });

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

    const ccDuration = (parse(computePeer.duration) ?? 0) / 1000;
    const ccDelegator = computePeer.delegator;

    const ccRewardDelegationRate = Math.floor(
      (computePeer.rewardDelegationRate / 100) * Number(PRECISION),
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
