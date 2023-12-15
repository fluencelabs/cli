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

import { DealClient } from "@fluencelabs/deal-aurora";
import { color } from "@oclif/color";
import { ethers } from "ethers";

import { isInteractive } from "./commandObj.js";
import type { UserProvidedConfig, Offer } from "./configs/project/provider.js";
import {
  defaultNumberProperties,
  type NumberProperty,
  numberProperties,
} from "./const.js";
import { commaSepStrToArr } from "./helpers/utils.js";
import { validatePositiveNumberOrEmpty } from "./helpers/validations.js";
import { checkboxes, confirm, input } from "./prompt.js";
import { getProvider } from "./provider.js";

async function promptToSetNumberProperty(
  offer: Offer,
  property: NumberProperty,
) {
  const propertyStr = await input({
    message: `Enter ${color.yellow(property)}`,
    validate: validatePositiveNumberOrEmpty,
    default: `${defaultNumberProperties[property]}`,
  });

  offer[property] = Number(propertyStr);
}

const DEFAULT_NUMBER_OF_NOXES = 3;

export type ProviderConfigArgs = (
  | {
      env: string | undefined;
      name: string | undefined;
    }
  | {
      env: "local";
      name?: undefined;
    }
) & {
  noxes?: number | undefined;
};

export async function addComputePeers(
  numberOfNoxes: number | undefined,
  userProvidedConfig: UserProvidedConfig,
) {
  let computePeersCounter = 0;
  let isAddingMoreComputePeers = true;

  do {
    const defaultName = `nox-${computePeersCounter}`;

    let name =
      numberOfNoxes === undefined
        ? await input({
            message: `Enter name for compute peer`,
            default: defaultName,
          })
        : defaultName;

    const peerId = await input({
      message: `Enter id for compute peer`,
      default: "",
      validate: async (input: string) => {
        if (input === "") {
          return "Must be a non-empty string";
        }

        const [{ digest }, { base58btc }] = await Promise.all([
          import("multiformats"),
          // eslint-disable-next-line import/extensions
          import("multiformats/bases/base58"),
        ]);

        digest.decode(base58btc.decode("z" + input));

        return true;
      },
    });

    if (name === defaultName) {
      name = defaultName;
      computePeersCounter = computePeersCounter + 1;
    }

    const slotsStr = await input({
      message: `Enter number of workers for ${color.yellow(name)}`,
      default: "1",
      validate: validatePositiveNumberOrEmpty,
    });

    const client = new DealClient(
      getProvider(userProvidedConfig.env),
      userProvidedConfig.env,
    );

    const core = await client.getCore();
    const minDuration = await core.minCCDuration();
    const minDurationDays = Number(minDuration) / 60;

    const capacityCommitmentDuration = await input({
      message: `Enter capacity commitment duration (min)`,
      default: minDurationDays,
      validate: (input: string) => {
        const days = Number(input);

        if (isNaN(days)) {
          return "Must be a number";
        }

        if (days < minDurationDays) {
          return `Must be at least ${minDurationDays} min`;
        }

        return true;
      },
    });

    const capacityCommitmentDelegator = await input({
      message: `Enter capacity commitment delegator`,
      default: "",
      validate: (input: string) => {
        if (!ethers.isAddress(input)) {
          return "Must be a valid address";
        }

        return true;
      },
    });

    const capacityCommitmentRewardDelegationRate = await input({
      message: `Enter capacity commitment reward delegation rate (%)`,
      default: "0",
      validate: (input: string) => {
        if (isNaN(Number(input))) {
          return "Must be a number";
        }

        if (Number(input) < 0) {
          return "Must be a positive number";
        } else if (Number(input) > 100) {
          return "Must be less than 100";
        }

        return true;
      },
    });

    userProvidedConfig.computePeers[name] = {
      peerId: peerId,
      capacityCommitment: {
        duration: Number(capacityCommitmentDuration),
        delegator: capacityCommitmentDelegator,
        rewardDelegationRate: Number(capacityCommitmentRewardDelegationRate),
      },
      computeUnits: Number(slotsStr),
    };

    if (numberOfNoxes !== undefined) {
      isAddingMoreComputePeers = numberOfNoxes > computePeersCounter;
      continue;
    }

    if (isInteractive) {
      isAddingMoreComputePeers = await confirm({
        message: "Do you want to add more compute peers",
      });

      continue;
    }

    isAddingMoreComputePeers = DEFAULT_NUMBER_OF_NOXES > computePeersCounter;
  } while (isAddingMoreComputePeers);
}

export async function addOffers(userProvidedConfig: UserProvidedConfig) {
  let isAddingMoreOffers = true;
  let offersCounter = 0;

  do {
    const defaultName = `offer-${offersCounter}`;

    const name = await input({
      message: `Enter name for offer`,
      default: defaultName,
    });

    if (name === defaultName) {
      offersCounter = offersCounter + 1;
    }

    const computePeerOptions = Object.keys(userProvidedConfig.computePeers);

    const computePeers = isInteractive
      ? await checkboxes({
          message: `Select compute peers for ${color.yellow(name)}`,
          options: computePeerOptions,
          validate: (choices: string[]) => {
            if (choices.length === 0) {
              return "Please select at least one compute peer";
            }

            return true;
          },
          oneChoiceMessage(choice) {
            return `Selected ${color.yellow(choice)}`;
          },
          onNoChoices() {
            throw new Error("No compute peers selected");
          },
        })
      : computePeerOptions;

    const effectorsString = await input({
      message: "Enter comma-separated list of effector CIDs",
      default: "",
    });

    const effectors =
      effectorsString === "" ? [] : commaSepStrToArr(effectorsString);

    const offer: Offer = {
      ...defaultNumberProperties,
      computePeers,
      ...(effectors.length > 0 ? { effectors } : {}),
    };

    for (const numberProperty of numberProperties) {
      await promptToSetNumberProperty(offer, numberProperty);
    }

    userProvidedConfig.offers[name] = offer;

    isAddingMoreOffers = await confirm({
      message: "Do you want to add more offers",
      default: false,
    });
  } while (isAddingMoreOffers);
}
