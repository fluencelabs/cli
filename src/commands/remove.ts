/**
 * Copyright 2022 Fluence Labs Limited
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

import assert from "node:assert";

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";

import { AquaCLI } from "../lib/aquaCli";
import {
  Deployed,
  DeployedConfig,
  initDeployedConfig,
} from "../lib/configs/projectConfigs/deployedConfig";
import { CommandObj, NAME_ARG } from "../lib/const";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { usage } from "../lib/helpers/usage";
import { getKeyPair } from "../lib/keyPairs/getKeyPair";
import { getRelayAddr } from "../lib/multiaddr";
import { ensureProjectDotFluenceDir } from "../lib/pathsGetters/getFluenceDir";
import { list } from "../lib/prompt";

export default class Remove extends Command {
  static override description = "Remove previously deployed config";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    timeout: Flags.string({
      description: "Remove timeout",
      helpValue: "<milliseconds>",
    }),
  };
  static override args = [
    { name: NAME_ARG, description: "Deployment config name" },
  ];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    await ensureProjectDotFluenceDir(this);

    const { flags, args } = await this.parse(Remove);
    const nameFromArgs: unknown = args[NAME_ARG];
    assert(nameFromArgs === undefined || typeof nameFromArgs === "string");

    const deployedConfig = await initDeployedConfig(this);

    const deployedConfigToRemove = await ensurePreviouslyDeployedConfig({
      nameFromArgs,
      commandObj: this,
      deployedConfig,
    });

    await removePreviouslyDeployedConfig({
      deployedConfig,
      deployedConfigToRemove,
      commandObj: this,
      timeout: flags.timeout,
    });
  }
}

/**
 * Ensures valid config name is returned
 * @param param0 { nameFromArgs: string | undefined; deployedConfig: DeployedConfig; commandObj: CommandObj;}
 * @returns Promise<string>
 */
const ensurePreviouslyDeployedConfig = async ({
  nameFromArgs,
  deployedConfig,
  commandObj,
}: {
  nameFromArgs: string | undefined;
  deployedConfig: DeployedConfig;
  commandObj: CommandObj;
}): Promise<Deployed> => {
  const previouslyDeployedConfig =
    nameFromArgs === undefined
      ? undefined
      : deployedConfig.deployed.find(
          ({ name }): boolean => name === nameFromArgs
        );

  if (previouslyDeployedConfig !== undefined) {
    return previouslyDeployedConfig;
  }

  if (typeof nameFromArgs === "string") {
    commandObj.warn(`No config ${color.yellow(nameFromArgs)} found`);
  }

  // prompt user for a valid name
  return list({
    message: "Select the name of the deployment config you want to remove",
    choices: deployedConfig.deployed.map(
      (value): { name: string; value: Deployed } => ({
        name: value.name,
        value,
      })
    ),
    oneChoiceMessage: (name): string =>
      `Do you want to remove previously deployed stuff from ${color.yellow(
        name
      )} config`,
    onNoChoices: (): never =>
      commandObj.error("You need a config to remove in order to continue"),
  });
};

/**
 * Gets key-pair for stuff that user selected for removal
 * removes each service from the config
 * removes each successfully removed service from the config and commits it to disk
 * @param param0 { name: string; commandObj: CommandObj; timeout: string | undefined; deployedConfig: DeployedConfig;}
 * @returns Promise<void>
 */
export const removePreviouslyDeployedConfig = async ({
  commandObj,
  timeout,
  deployedConfig,
  deployedConfigToRemove,
}: Readonly<{
  commandObj: CommandObj;
  timeout: string | undefined;
  deployedConfig: DeployedConfig;
  deployedConfigToRemove: Deployed;
}>): Promise<void> => {
  const aquaCli = new AquaCLI(commandObj);

  const successfullyRemovedServices: Array<string> = [];

  const { keyPairName, timestamp, services } = deployedConfigToRemove;
  const keyPair = await getKeyPair({ commandObj, keyPairName });

  if (keyPair instanceof Error) {
    commandObj.warn(
      getMessageWithKeyValuePairs(`${keyPair.message}. From config`, {
        "deployed at": timestamp,
      })
    );
    return;
  }

  for (const { serviceId, peerId, name, blueprintId } of services) {
    const addr = getRelayAddr(peerId, deployedConfigToRemove.knownRelays);

    try {
      // eslint-disable-next-line no-await-in-loop
      await aquaCli.run(
        {
          command: "remote remove_service",
          flags: {
            addr,
            id: serviceId,
            sk: keyPair.secretKey,
            on: peerId,
            timeout,
          },
        },
        `Removing service`,
        {
          name,
          id: serviceId,
          blueprintId,
          relay: addr,
          "deployed on": peerId,
          "deployed at": timestamp,
        }
      );

      successfullyRemovedServices.push(serviceId);
    } catch (error) {
      commandObj.warn(`When removing service\n${String(error)}`);
    }
  }

  deployedConfig.deployed = deployedConfig.deployed.reduce<Array<Deployed>>(
    (acc, deployed): Array<Deployed> => {
      if (deployed.name === deployedConfigToRemove.name) {
        deployed.services = deployed.services.filter(
          ({ serviceId }): boolean =>
            !successfullyRemovedServices.includes(serviceId)
        );
      }

      if (deployed.services.length > 0) {
        acc.push(deployed);
      }

      return acc;
    },
    []
  );

  await deployedConfig.$commit();

  if (successfullyRemovedServices.length !== services.length) {
    throw new Error(
      "Not all services were successful removed. Please make sure to remove them in order to continue"
    );
  }
};
