/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { color } from "@oclif/color";

import { resolveOffersFromProviderConfig } from "./chain/offer/offer.js";
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
