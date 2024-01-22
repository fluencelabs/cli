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
import { initNewReadonlyProviderConfig } from "../configs/project/provider.js";
import { getDealClient, promptConfirmTx, waitTx } from "../dealClient.js";
import { commaSepStrToArr, splitErrorsAndResults } from "../helpers/utils.js";
import { getSecretKeyOrReturnExisting } from "../keyPairs.js";
import { getPeerIdFromSecretKey } from "../multiaddres.js";

const CAPACITY_COMMITMENT_CREATED_EVENT = "CommitmentCreated";
const DEFAULT_CONFIRMATIONS = 1;

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

  const PRECISION = await core.precision();

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
    commandObj.logToStderr(
      color.gray(`Create capacity commitment for ${name}`),
    );

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

    const registerPeerTx = await capacity.createCommitment(
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

    commandObj.logToStderr(
      color.green(
        `Capacity commitment was created with id ${color.yellow(id)}`,
      ),
    );
  }

  commandObj.logToStderr(color.green(`Commitments were registered`));

  commandObj.logToStderr("Approve collateral for all sent CC...");
  // Fetch created commitmentIds from chain.
  const filterCreatedCC = capacity.filters.CommitmentCreated;

  const capacityCommitmentCreatedEvents =
    await capacity.queryFilter(filterCreatedCC);

  const capacityCommitmentCreatedEventsLast = capacityCommitmentCreatedEvents
    .reverse()
    .slice(0, computePeersToRegister.length);

  // 1 CC for each peer.
  expect(capacityCommitmentCreatedEventsLast.length).toBe(
    computePeersToRegister.length,
  );

  const commitmentIds = capacityCommitmentCreatedEventsLast.map((event) => {
    return event.args.commitmentId;
  });

  let collateralToApproveCommitments = 0n;

  for (const commitmentId of commitmentIds) {
    const commitment = await capacity.getCommitment(commitmentId);

    const collateralToApproveCommitment =
      commitment.collateralPerUnit * commitment.unitCount;

    commandObj.logToStderr(
      `Collateral for commitmentId: ${commitmentId} = ${collateralToApproveCommitment}...`,
    );

    collateralToApproveCommitments =
      collateralToApproveCommitments + collateralToApproveCommitment;
  }

  commandObj.logToStderr(
    `Send approve of FLT for all commitments for value: ${collateralToApproveCommitments}...`,
  );

  const fltContract = await dealClient.getFLT();
  const capacityContractAddress = await capacity.getAddress();

  const collateralToApproveCommitmentsTx = await fltContract.approve(
    capacityContractAddress,
    collateralToApproveCommitments,
  );

  await collateralToApproveCommitmentsTx.wait(DEFAULT_CONFIRMATIONS);

  commandObj.logToStderr("Deposit collateral for all sent CC...");

  for (const commitmentId of commitmentIds) {
    commandObj.logToStderr(
      `Deposit collateral for commitmentId: ${commitmentId}...`,
    );

    const depositCollateralTx = await capacity.depositCollateral(commitmentId);

    await depositCollateralTx.wait(DEFAULT_CONFIRMATIONS);
  }
}
