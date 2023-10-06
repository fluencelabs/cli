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

import { commandObj, isInteractive } from "./commandObj.js";
import {
  type UserProvidedConfig,
  type Offer,
} from "./configs/project/provider.js";
import { numberProperties } from "./const.js";
import { defaultNumberProperties, type NumberProperty } from "./const.js";
import { commaSepStrToArr } from "./helpers/utils.js";
import { validatePositiveNumberOrEmpty } from "./helpers/validations.js";
import { checkboxes, confirm, input } from "./prompt.js";

async function promptToSetNumberProperty(
  offer: Offer,
  property: NumberProperty,
) {
  const defaultValue = defaultNumberProperties[property];

  const propertyStr = await input({
    message: `Enter ${color.yellow(property)} (default: ${defaultValue})`,
    validate: validatePositiveNumberOrEmpty,
    allowEmpty: true,
  });

  offer[property] = propertyStr === "" ? defaultValue : Number(propertyStr);
}

export async function generateUserProviderConfig() {
  const userProvidedConfig: UserProvidedConfig = {
    computePeers: {},
  };

  if (!isInteractive) {
    return userProvidedConfig;
  }

  const needsChain = await confirm({
    message: "Do you require creating deels on blockchain",
  });

  commandObj.logToStderr(`Add compute peers`);
  let isAddingMoreComputePeers: boolean;
  let computePeersCounter = 0;

  do {
    const defaultName = `nox-${computePeersCounter}`;

    let name = await input({
      message: `Enter name for compute peer. Default: ${defaultName}`,
      allowEmpty: true,
    });

    if (name === "") {
      name = defaultName;
      computePeersCounter = computePeersCounter + 1;
    }

    if (needsChain) {
      const slotsStr = await input({
        message: `Enter number of workers for ${color.yellow(
          name,
        )}. Default: 1`,
        allowEmpty: true,
        validate: validatePositiveNumberOrEmpty,
      });

      userProvidedConfig.computePeers[name] = {
        worker: slotsStr === "" ? 1 : Number(slotsStr),
      };
    } else {
      userProvidedConfig.computePeers[name] = {};
    }

    isAddingMoreComputePeers = await confirm({
      message: "Do you want to add more compute peers",
    });
  } while (isAddingMoreComputePeers);

  commandObj.logToStderr(`Add offers`);
  let isAddingMoreOffers: boolean;
  let offersCounter = 0;

  if (!needsChain) {
    return userProvidedConfig;
  }

  userProvidedConfig.offers = {};

  do {
    const defaultName = `offer-${offersCounter}`;

    let name = await input({
      message: `Enter name for offer. Default: ${defaultName}`,
      allowEmpty: true,
    });

    if (name === "") {
      name = defaultName;
      offersCounter = offersCounter + 1;
    }

    const computePeers = await checkboxes({
      message: `Select compute peers for ${color.yellow(name)}`,
      options: Object.keys(userProvidedConfig.computePeers),
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
    });

    const effectorsString = await input({
      message:
        "Enter comma-separated list of effector CIDs (default: no effectors)",
      allowEmpty: true,
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
    });
  } while (isAddingMoreOffers);

  return userProvidedConfig;
}
