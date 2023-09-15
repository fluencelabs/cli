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
  type ComputePeer,
  type UserProvidedConfig,
  initReadonlyProviderConfig,
} from "../../lib/configs/project/provider.js";
import { numberProperties } from "../../lib/const.js";
import {
  defaultNumberProperties,
  type NumberProperty,
} from "../../lib/const.js";
import { commaSeparatedToArr } from "../../lib/helpers/commaSeparatedToArr.js";
import { validatePositiveNumberOrEmpty } from "../../lib/helpers/validations.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm, input } from "../../lib/prompt.js";

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
  userProvidedConfig: UserProvidedConfig,
  property: NumberProperty,
) {
  const defaultValue = defaultNumberProperties[property];

  const propertyStr = await input({
    message: `Enter ${color.yellow(property)} (default: ${defaultValue})`,
    validate: validatePositiveNumberOrEmpty,
    allowEmpty: true,
  });

  userProvidedConfig[property] =
    propertyStr === "" ? defaultValue : Number(propertyStr);
}

async function generateUserProviderConfig() {
  const userProvidedConfig: UserProvidedConfig = {
    computePeers: [],
    effectors: [],
    ...defaultNumberProperties,
  };

  if (!isInteractive) {
    return userProvidedConfig;
  }

  for (const numberProperty of numberProperties) {
    await promptToSetNumberProperty(userProvidedConfig, numberProperty);
  }

  do {
    const computePeer = await promptForComputePeer();
    userProvidedConfig.computePeers.push(computePeer);

    const isAddingMore = await confirm({
      message: "Do you want to add more compute peers",
    });

    if (!isAddingMore) {
      break;
    }
  } while (true);

  const effectors = await input({
    message:
      "Enter comma-separated list of effector CIDs (default: empty list)",
  });

  userProvidedConfig.effectors = commaSeparatedToArr(effectors);

  return userProvidedConfig;
}

async function promptForComputePeer(): Promise<ComputePeer> {
  const peerId = await input({
    message: "Enter peer id of your compute peer",
  });

  const slotsStr = await input({
    message: `Enter number of worker slots for ${color.yellow(peerId)}`,
    validate: validatePositiveNumberOrEmpty,
  });

  return {
    peerId,
    slots: Number(slotsStr),
  };
}
