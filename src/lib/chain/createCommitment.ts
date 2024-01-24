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
import parse from "parse-duration";

import { commandObj } from "../commandObj.js";
import { ensureReadonlyProviderConfig } from "../configs/project/provider.js";
import { dbg } from "../dbg.js";
import { getDealClient, promptConfirmTx, waitTx } from "../dealClient.js";
import {
  commaSepStrToArr,
  jsonStringify,
  splitErrorsAndResults,
} from "../helpers/utils.js";
import { getSecretKeyOrReturnExisting } from "../keyPairs.js";
import { getPeerIdFromSecretKey } from "../multiaddres.js";

import { peerIdToUint8Array } from "./peerIdToUint8Array.js";

const CAPACITY_COMMITMENT_CREATED_EVENT = "CommitmentCreated";

export async function createCommitment(flags: {
  noxes?: number | undefined;
  config?: string | undefined;
  env: string | undefined;
  "priv-key": string | undefined;
  "nox-names"?: string | undefined;
}) {
  const { dealClient, signerOrWallet } = await getDealClient();
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();
  const PRECISION = await core.precision();

  const noxNames =
    flags["nox-names"] === undefined
      ? []
      : commaSepStrToArr(flags["nox-names"]);

  const providerConfig = await ensureReadonlyProviderConfig(flags);

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

  const signerAddress = await signerOrWallet.getAddress();
  const commitmentIds: string[] = [];

  for (const [name, computePeer] of computePeersToRegister) {
    commandObj.logToStderr(
      color.gray(`Create capacity commitment for ${name}`),
    );

    const { secretKey } = await getSecretKeyOrReturnExisting(name);
    const peerId = await getPeerIdFromSecretKey(secretKey);
    const peerIdUint8Arr = await peerIdToUint8Array(peerId);

    const ccDuration = (parse(computePeer.duration) ?? 0) / 1000;
    const ccDelegator = computePeer.delegator;

    const ccRewardDelegationRate = Math.floor(
      (computePeer.rewardDelegationRate / 100) * Number(PRECISION),
    );

    promptConfirmTx(flags["priv-key"]);

    const createCommitmentParams: Parameters<typeof capacity.createCommitment> =
      [
        peerIdUint8Arr,
        ccDuration,
        ccDelegator ?? signerAddress,
        ccRewardDelegationRate,
      ];

    dbg(`createCommitmentParams: ${jsonStringify(createCommitmentParams)}`);

    const registerPeerTx = await capacity.createCommitment(
      ...createCommitmentParams,
    );

    const res = await waitTx(registerPeerTx);
    const event = capacity.getEvent(CAPACITY_COMMITMENT_CREATED_EVENT);

    const log = res.logs.find((log) => {
      return log.topics[0] === event.fragment.topicHash;
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

    commandObj.logToStderr(
      color.green(
        `Capacity commitment was created with id ${color.yellow(id)}`,
      ),
    );

    commitmentIds.push(id);
  }

  commandObj.logToStderr(
    color.green(`Commitments ${commitmentIds.join(", ")} were registered`),
  );

  return commitmentIds;
}
