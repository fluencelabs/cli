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
import type { UserProvidedConfig, Offer } from "./configs/project/provider.js";
import {
  defaultNumberProperties,
  type NumberProperty,
  numberProperties,
} from "./const.js";
import { commaSepStrToArr } from "./helpers/utils.js";
import { validatePositiveNumberOrEmpty } from "./helpers/validations.js";
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
  numberOfNoxes?: number | undefined;
};

export async function generateUserProviderConfig({
  numberOfNoxes,
}: ProviderConfigArgs) {
  const userProvidedConfig: UserProvidedConfig = {
    computePeers: {},
    offers: {},
  };

  let isAddingMoreComputePeers: boolean;
  let computePeersCounter = 0;

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

    const slotsStr = await input({
      message: `Enter number of workers for ${color.yellow(name)}`,
      default: "1",
      validate: validatePositiveNumberOrEmpty,
    });

    userProvidedConfig.computePeers[name] = {
      worker: Number(slotsStr),
    };

    isAddingMoreComputePeers =
      numberOfNoxes === undefined && isInteractive
        ? await confirm({
            message: "Do you want to add more compute peers",
          })
        : (numberOfNoxes ?? DEFAULT_NUMBER_OF_NOXES) > computePeersCounter;
  } while (isAddingMoreComputePeers);

  let isAddingMoreOffers: boolean;
  let offersCounter = 0;

  do {
    const defaultName = `offer-${offersCounter}`;

    let name = await input({
      message: `Enter name for offer`,
      default: defaultName,
    });

    if (name === defaultName) {
      name = defaultName;
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

  return userProvidedConfig;
}
