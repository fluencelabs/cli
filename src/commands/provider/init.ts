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

import { rm } from "fs/promises";

import { color } from "@oclif/color";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import {
  initNewProviderConfig,
  type UserProvidedConfig,
  initReadonlyProviderConfig,
  type Offer,
} from "../../lib/configs/project/provider.js";
import { numberProperties } from "../../lib/const.js";
import {
  defaultNumberProperties,
  type NumberProperty,
} from "../../lib/const.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { validatePositiveNumberOrEmpty } from "../../lib/helpers/validations.js";
import { initCli } from "../../lib/lifeCycle.js";
import { checkboxes, confirm, input } from "../../lib/prompt.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description =
    "Init provider config. Creates a config file in the current directory.";
  static override flags = {
    ...baseFlags,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Init));
    const maybeProviderConfig = await initReadonlyProviderConfig();

    if (maybeProviderConfig !== null) {
      const isOverwriting = await confirm({
        message: `Provider config already exists at ${color.yellow(
          maybeProviderConfig.$getPath(),
        )}. Do you want to overwrite it?`,
      });

      if (!isOverwriting) {
        return commandObj.error(
          `Provider config already exists at ${color.yellow(
            maybeProviderConfig.$getPath(),
          )}. Aborting.`,
        );
      }
    }

    const userProvidedConfig = await generateUserProviderConfig();

    if (maybeProviderConfig !== null) {
      await rm(maybeProviderConfig.$getPath(), { force: true });
    }

    const providerConfig = await initNewProviderConfig(userProvidedConfig);

    commandObj.logToStderr(
      `Successfully created provider config at ${color.yellow(
        providerConfig.$getPath(),
      )}`,
    );
  }
}

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

async function generateUserProviderConfig() {
  const userProvidedConfig: UserProvidedConfig = {
    offers: {},
    computePeers: {},
  };

  if (!isInteractive) {
    return userProvidedConfig;
  }

  commandObj.logToStderr(`Add compute peers`);
  let isAddingMoreComputePeers: boolean;
  let computePeersCounter = 0;

  do {
    const defaultName = `peer-${computePeersCounter}`;

    let name = await input({
      message: `Enter name for compute peer. Default: ${defaultName}`,
      allowEmpty: true,
    });

    if (name === "") {
      name = defaultName;
      computePeersCounter = computePeersCounter + 1;
    }

    const slotsStr = await input({
      message: `Enter number of workers for ${color.yellow(name)}. Default: 1`,
      allowEmpty: true,
      validate: validatePositiveNumberOrEmpty,
    });

    userProvidedConfig.computePeers[name] = {
      worker: slotsStr === "" ? 1 : Number(slotsStr),
    };

    isAddingMoreComputePeers = await confirm({
      message: "Do you want to add more compute peers",
    });
  } while (isAddingMoreComputePeers);

  commandObj.logToStderr(`Add offers`);
  let isAddingMoreOffers: boolean;
  let offersCounter = 0;

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

    const effectors = commaSepStrToArr(effectorsString);

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
