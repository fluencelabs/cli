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

import { color } from "@oclif/color";

import { resolveOffersFromProviderConfig } from "./chain/offer.js";
import { commandObj } from "./commandObj.js";
import {
  ensureComputerPeerConfigs,
  ensureReadonlyProviderConfig,
  type EnsureComputerPeerConfig,
} from "./configs/project/provider.js";
import {
  NOX_NAMES_FLAG_NAME,
  ALL_FLAG_VALUE,
  OFFER_FLAG_NAME,
} from "./const.js";
import { commaSepStrToArr, splitErrorsAndResults } from "./helpers/utils.js";
import { checkboxes } from "./prompt.js";

export async function resolveComputePeersByNames(
  flags: {
    [NOX_NAMES_FLAG_NAME]?: string | undefined;
    [OFFER_FLAG_NAME]?: string | undefined;
  } = {},
) {
  const computePeers = await ensureComputerPeerConfigs();

  if (flags[NOX_NAMES_FLAG_NAME] === ALL_FLAG_VALUE) {
    return computePeers;
  }

  const providerConfig = await ensureReadonlyProviderConfig();

  if (flags[OFFER_FLAG_NAME] !== undefined) {
    const computerPeerNamesFromOffers = (
      await resolveOffersFromProviderConfig(flags)
    ).flatMap(({ computePeersFromProviderConfig }) => {
      return computePeersFromProviderConfig.map(({ name }) => {
        return name;
      });
    });

    return computePeers.filter(({ name }) => {
      return computerPeerNamesFromOffers.includes(name);
    });
  }

  if (flags[NOX_NAMES_FLAG_NAME] === undefined) {
    return checkboxes<EnsureComputerPeerConfig, never>({
      message: `Select one or more nox names from ${providerConfig.$getPath()}`,
      options: computePeers.map((computePeer) => {
        return {
          name: computePeer.name,
          value: computePeer,
        };
      }),
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return "Please select at least one deployment";
        }

        return true;
      },
      oneChoiceMessage(choice) {
        return `One nox found at ${providerConfig.$getPath()}: ${color.yellow(
          choice,
        )}. Do you want to select it`;
      },
      onNoChoices() {
        commandObj.error(
          `You must have at least one nox specified in ${providerConfig.$getPath()}`,
        );
      },
      flagName: NOX_NAMES_FLAG_NAME,
    });
  }

  const noxNames = commaSepStrToArr(flags[NOX_NAMES_FLAG_NAME]);

  const [unknownNoxNames, validNoxNames] = splitErrorsAndResults(
    noxNames,
    (name) => {
      if (
        computePeers.find((cp) => {
          return cp.name === name;
        }) !== undefined
      ) {
        return { result: name };
      }

      return { error: name };
    },
  );

  if (unknownNoxNames.length > 0) {
    commandObj.error(
      `nox names: ${color.yellow(
        unknownNoxNames.join(", "),
      )} not found in ${color.yellow(
        "computePeers",
      )} property of ${providerConfig.$getPath()}`,
    );
  }

  return computePeers.filter(({ name }) => {
    return validNoxNames.includes(name);
  });
}

export type ResolvedComputePeer = Awaited<
  ReturnType<typeof resolveComputePeersByNames>
>[number];
