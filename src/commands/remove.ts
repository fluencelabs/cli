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

import { Command, Flags } from "@oclif/core";
import { yamlDiffPatch } from "yaml-diff-patch";

import { AquaCLI } from "../lib/aquaCli";
import {
  Deployed,
  DeployedConfig,
  getDeployedConfig,
} from "../lib/configs/deployedConfig";
import type { UpdateConfig } from "../lib/configs/ensureConfig";
import type { CommandObj } from "../lib/const";
import { ensureFluenceProjectDir } from "../lib/getFluenceDir";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { getKeyPair } from "../lib/keyPairs/getKeyPair";
import { getRandomAddr } from "../lib/multiaddr";
import { checkboxes, list } from "../lib/prompt";

export default class Remove extends Command {
  static override description = "Remove previously deployed";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    name: Flags.string({
      description: "Name of the deployment",
    }),
    timeout: Flags.string({
      description: "Remove timeout",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Remove);

    const fluenceProjectDir = await ensureFluenceProjectDir(this);

    const deployedConfigResult = await getDeployedConfig(fluenceProjectDir);

    if (deployedConfigResult instanceof Error) {
      return this.error(deployedConfigResult.message);
    }

    const [deployedConfig] = deployedConfigResult;

    const choices = [
      ...new Set(deployedConfig.deployed.map(({ name }): string => name)),
    ];

    if (choices.length === 0) {
      this.error("There no deployments to remove");
    }

    const firstChoice = choices[0];

    const name =
      flags.name ??
      (choices.length === 1 && firstChoice !== undefined
        ? firstChoice
        : await list({
            message: "Enter a name of the deployment",
            choices,
          }));

    await removePreviouslyDeployed({
      name,
      commandObj: this,
      aquaCli: new AquaCLI(this),
      fluenceProjectDir,
      timeout: flags.timeout,
    });
  }
}

export const getPreviouslyDeployedConfig = async ({
  name,
  fluenceProjectDir,
  commandObj,
  newDeployed,
}: {
  name: string;
  fluenceProjectDir: string;
  commandObj: CommandObj;
  newDeployed?: Deployed;
}): Promise<{
  previouslyDeployedConfigs: Array<Deployed>;
  updateDeployedConfig: UpdateConfig<DeployedConfig>;
}> => {
  const deployedConfigResult = await getDeployedConfig(fluenceProjectDir);

  if (deployedConfigResult instanceof Error) {
    if (newDeployed !== undefined) {
      commandObj.warn(
        `Deployed services information will not be saved: ${yamlDiffPatch(
          "{}",
          {},
          newDeployed
        )}`
      );
    }

    return commandObj.error(deployedConfigResult.message);
  }

  const [deployedConfig, updateDeployedConfig] = deployedConfigResult;

  return {
    previouslyDeployedConfigs: deployedConfig.deployed.filter(
      (deployedConfig): boolean => deployedConfig.name === name
    ),
    updateDeployedConfig,
  };
};

export const removePreviouslyDeployed = async ({
  name,
  fluenceProjectDir,
  commandObj,
  aquaCli,
  timeout,
  newDeployed,
}: Readonly<{
  name: string;
  fluenceProjectDir: string;
  commandObj: CommandObj;
  aquaCli: AquaCLI;
  timeout: string | undefined;
  newDeployed?: Deployed;
}>): Promise<DeployedConfig> => {
  const { previouslyDeployedConfigs, updateDeployedConfig } =
    await getPreviouslyDeployedConfig({ name, fluenceProjectDir, commandObj });

  const deployedToRemove =
    previouslyDeployedConfigs.length === 1
      ? previouslyDeployedConfigs.map(({ timestamp }): string => timestamp)
      : await checkboxes({
          message: "Select timestamps of deployments you want to remove",
          choices: previouslyDeployedConfigs.map(
            ({
              timestamp,
            }): Parameters<typeof checkboxes>[0]["choices"][0] => ({
              name: timestamp,
            })
          ),
        });

  const successfullyRemovedServices: Map<string, Array<string>> = new Map();
  const removalErrors: string[] = [];

  const previouslyDeployedItemsToRemove = previouslyDeployedConfigs.filter(
    ({ timestamp }): boolean => deployedToRemove.includes(timestamp)
  );

  for (const previouslyDeployedItemToRemove of previouslyDeployedItemsToRemove) {
    const addr = getRandomAddr(previouslyDeployedItemToRemove.knownRelays);
    const { keyPairName, timestamp, services } = previouslyDeployedItemToRemove;
    // eslint-disable-next-line no-await-in-loop
    const keyPair = await getKeyPair(commandObj, keyPairName);

    if (keyPair instanceof Error) {
      removalErrors.push(
        getMessageWithKeyValuePairs(`${keyPair.message}. From config`, {
          "deployed at": timestamp,
        })
      );
      continue;
    }

    for (const previouslyDeployedServiceToRemove of services) {
      const { serviceId, peerId, name, blueprintId } =
        previouslyDeployedServiceToRemove;

      const infoKeyValuePairs = {
        name,
        id: serviceId,
        blueprintId,
        "deployed on": peerId,
        "deployed at": timestamp,
      };

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
          infoKeyValuePairs
        );
        successfullyRemovedServices.set(timestamp, [
          ...(successfullyRemovedServices.get(timestamp) ?? []),
          serviceId,
        ]);
      } catch (error) {
        removalErrors.push(
          getMessageWithKeyValuePairs(
            `${String(error)}\n when removing service`,
            infoKeyValuePairs
          )
        );
      }
    }
  }

  for (const error of removalErrors) {
    commandObj.warn(error);
  }

  return updateDeployedConfig((deployedConfig): DeployedConfig => {
    const deployedArray = [];

    for (const deployed of deployedConfig.deployed) {
      const removedTimestamps = successfullyRemovedServices.get(
        deployed.timestamp
      );

      if (removedTimestamps !== undefined) {
        deployed.services = deployed.services.filter(
          ({ serviceId }): boolean => !removedTimestamps.includes(serviceId)
        );
      }

      if (deployed.services.length > 0) {
        deployedArray.push(deployed);
      }
    }

    deployedConfig.deployed = deployedArray;
    if (newDeployed !== undefined) {
      deployedConfig.deployed.push(newDeployed);
    }

    return deployedConfig;
  });
};
