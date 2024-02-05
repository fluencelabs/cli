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

import { isInteractive } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import type { UserProvidedConfig, Offer } from "./configs/project/provider.js";
import {
  defaultNumberProperties,
  type NumberProperty,
  numberProperties,
  DEFAULT_CC_REWARD_DELEGATION_RATE,
  DURATION_EXAMPLE,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
} from "./const.js";
import { commaSepStrToArr } from "./helpers/utils.js";
import {
  ccDurationValidator,
  getMinCCDuration,
  validateAddress,
} from "./helpers/validateCapacityCommitment.js";
import {
  validatePercent,
  validatePositiveNumberOrEmpty,
} from "./helpers/validations.js";
import { checkboxes, confirm, input } from "./prompt.js";

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

export type ProviderConfigArgs = {
  env: string | undefined;
  noxes?: number | undefined;
};

export async function addComputePeers(
  numberOfNoxes: number | undefined,
  userProvidedConfig: UserProvidedConfig,
) {
  let computePeersCounter = 0;
  let isAddingMoreComputePeers = true;
  const isLocal = envConfig?.fluenceEnv === "local";
  const validateCCDuration = await ccDurationValidator(isLocal);
  const minDuration = await getMinCCDuration(isLocal);

  do {
    const defaultName = `nox-${computePeersCounter}`;

    let name =
      numberOfNoxes === undefined
        ? await input({
            message: `Enter name for compute peer`,
            default: defaultName,
          })
        : defaultName;

    if (name === defaultName) {
      name = defaultName;
      computePeersCounter = computePeersCounter + 1;
    }

    const computeUnitsString = await input({
      message: `Enter number of compute units for ${color.yellow(name)}`,
      default: `${DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX}`,
      validate: validatePositiveNumberOrEmpty,
    });

    const capacityCommitmentDuration = await input({
      message: `Enter capacity commitment duration ${DURATION_EXAMPLE}`,
      default: `${minDuration} sec`,
      validate: validateCCDuration,
    });

    const capacityCommitmentDelegator = await input({
      // default: anybody can activate capacity commitment
      // optional
      message: `Enter capacity commitment delegator address`,
      validate: validateAddress,
    });

    const capacityCommitmentRewardDelegationRate = await input({
      message: `Enter capacity commitment reward delegation rate (in %)`,
      default: `${DEFAULT_CC_REWARD_DELEGATION_RATE}`,
      validate: validatePercent,
    });

    if (!("capacityCommitments" in userProvidedConfig)) {
      userProvidedConfig.capacityCommitments = {};
    }

    userProvidedConfig.capacityCommitments[name] = {
      duration: capacityCommitmentDuration,
      delegator: capacityCommitmentDelegator,
      rewardDelegationRate: Number(capacityCommitmentRewardDelegationRate),
    };

    userProvidedConfig.computePeers[name] = {
      computeUnits: Number(computeUnitsString),
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
    const defaultName =
      offersCounter === 0 ? "offer" : `offer-${offersCounter}`;

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
