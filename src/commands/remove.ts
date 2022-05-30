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
import { checkboxes, list } from "../lib/prompt";

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

    const name = await ensureName({
      nameFromArgs,
      commandObj: this,
      deployedConfig,
    });

    await removePreviouslyDeployedConfigByName({
      deployedConfig,
      name,
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
const ensureName = async ({
  nameFromArgs,
  deployedConfig,
  commandObj,
}: {
  nameFromArgs: string | undefined;
  deployedConfig: DeployedConfig;
  commandObj: CommandObj;
}): Promise<string> => {
  const previouslyDeployedConfigs = [
    ...new Set(deployedConfig.deployed.map(({ name }): string => name)),
  ];

  if (typeof nameFromArgs === "string") {
    if (previouslyDeployedConfigs.includes(nameFromArgs)) {
      // return back the name if there are config/configs with this name
      return nameFromArgs;
    }

    commandObj.warn(`No config ${color.yellow(nameFromArgs)} found`);
  }

  // prompt user for a valid name
  return list({
    message: "Select the name of the deployment config you want to remove",
    choices: previouslyDeployedConfigs.map(
      (name): { name: string; value: string } => ({
        name,
        value: name,
      })
    ),
    oneChoiceMessage: (name): string =>
      `Do you want to remove ${color.yellow(name)}`,
    onNoChoices: (): never => commandObj.error("There is nothing to remove"),
  });
};

export const filterPreviouslyDeployedConfigsByName = (
  deployedConfig: DeployedConfig,
  name: string
): Array<Deployed> =>
  deployedConfig.deployed.filter((deployed): boolean => deployed.name === name);

/**
 * Prompts user to select timestamps of the stuff he wants to remove,
 * gets key-pairs for stuff that user selected for removal
 * removes each service from the configs
 * removes each successfully removed service from the config and commits it to disk
 * @param param0 { name: string; commandObj: CommandObj; timeout: string | undefined; deployedConfig: DeployedConfig;}
 * @returns Promise<void>
 */
export const removePreviouslyDeployedConfigByName = async ({
  name,
  commandObj,
  timeout,
  deployedConfig,
}: Readonly<{
  name: string;
  commandObj: CommandObj;
  timeout: string | undefined;
  deployedConfig: DeployedConfig;
}>): Promise<void> => {
  const aquaCli = new AquaCLI(commandObj);

  const previouslyDeployedConfigs = filterPreviouslyDeployedConfigsByName(
    deployedConfig,
    name
  );

  const previouslyDeployedConfigsToRemove = await checkboxes({
    message: "Select timestamps of the stuff you want to remove",
    onNoChoices: (): never => {
      throw new Error("There is nothing to remove");
    },
    oneChoiceMessage: (timeStamp): string =>
      `Do you want to remove stuff that was deployed on ${color.yellow(
        timeStamp
      )}`,
    choices: previouslyDeployedConfigs.map(
      (value): { name: string; value: Deployed } => ({
        name: value.timestamp,
        value,
      })
    ),
  });

  const successfullyRemoved: Record<string, Array<string>> = {};

  for (const previouslyDeployedConfig of previouslyDeployedConfigsToRemove) {
    const { keyPairName, timestamp, services } = previouslyDeployedConfig;
    // eslint-disable-next-line no-await-in-loop
    const keyPair = await getKeyPair({ commandObj, keyPairName });

    if (keyPair instanceof Error) {
      commandObj.warn(
        getMessageWithKeyValuePairs(`${keyPair.message}. From config`, {
          "deployed at": timestamp,
        })
      );
      continue;
    }

    for (const { serviceId, peerId, name, blueprintId } of services) {
      const addr = getRelayAddr(peerId, previouslyDeployedConfig.knownRelays);

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

        successfullyRemoved[timestamp] = [
          ...(successfullyRemoved[timestamp] ?? []),
          serviceId,
        ];
      } catch (error) {
        commandObj.warn(`When removing service\n${String(error)}`);
      }
    }
  }

  deployedConfig.deployed = deployedConfig.deployed.reduce<Array<Deployed>>(
    (acc, deployed): Array<Deployed> => {
      const successfullyRemovedServices =
        successfullyRemoved[deployed.timestamp];

      if (deployed.name === name && successfullyRemovedServices !== undefined) {
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
};
