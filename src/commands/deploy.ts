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
import path from "node:path";

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";

import { AquaCLI } from "../lib/aquaCli";
import {
  Deployed,
  DeployedServiceConfig,
  initDeployedConfig,
} from "../lib/configs/projectConfigs/deployedConfig";
import {
  DeploymentConfig,
  initReadonlyProjectConfig,
} from "../lib/configs/projectConfigs/projectConfig";
import {
  CommandObj,
  DEPLOYMENT_CONFIG_FILE_NAME,
  KEY_PAIR_FLAG,
  NAME_ARG,
} from "../lib/const";
import { usage } from "../lib/helpers/usage";
import type { ConfigKeyPair } from "../lib/keyPairs/generateKeyPair";
import { getKeyPairFromFlags } from "../lib/keyPairs/getKeyPair";
import { getRelayAddr } from "../lib/multiaddr";
import { getArtifactsPath } from "../lib/pathsGetters/getArtifactsPath";
import { ensureProjectDotFluenceDir } from "../lib/pathsGetters/getFluenceDir";
import { confirm, list } from "../lib/prompt";

import { removePreviouslyDeployedConfig } from "./remove";

export default class Deploy extends Command {
  static override description = "Deploy service to the remote peer";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    timeout: Flags.string({
      description: "Deployment and remove timeout",
      helpValue: "<milliseconds>",
    }),
    ...KEY_PAIR_FLAG,
  };
  static override args = [
    { name: NAME_ARG, description: "Deployment config name" },
  ];
  static override usage: string = usage(this);

  async run(): Promise<void> {
    await ensureProjectDotFluenceDir(this);

    const { flags, args } = await this.parse(Deploy);

    const keyPair = await getKeyPairFromFlags(flags, this);
    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }
    const nameArg: unknown = args[NAME_ARG];
    assert(nameArg === undefined || typeof nameArg === "string");

    const deploymentConfig = await ensureDeploymentConfig(nameArg, this);
    const deployedConfig = await initDeployedConfig(this);

    const deployedConfigToRemove = deployedConfig.deployed.find(
      (deployed): boolean => deployed.name === deploymentConfig.name
    );
    if (deployedConfigToRemove !== undefined) {
      // Prompt user to remove previously deployed stuff if this
      // config was already deployed before
      const doRemove = await confirm({
        message: `Do you want to remove previously deployed stuff from ${color.yellow(
          deployedConfigToRemove.name
        )} config`,
      });

      if (!doRemove) {
        this.error("You have to confirm in order to continue");
      }

      await removePreviouslyDeployedConfig({
        deployedConfig,
        deployedConfigToRemove,
        commandObj: this,
        timeout: flags.timeout,
      });
    }

    const newDeployed = await deploy({
      deploymentConfig,
      commandObj: this,
      keyPair,
      timeout: flags.timeout,
    });

    deployedConfig.deployed.push(newDeployed);
    return deployedConfig.$commit();
  }
}

type DeployServiceOptions = Readonly<{
  name: string;
  peerId: string;
  artifactsPath: string;
  addr: string;
  secretKey: string;
  aquaCli: Readonly<AquaCLI>;
  timeout: string | undefined;
}>;

/**
 * Deploy by first uploading .wasm files and configs, possibly creating a new blueprint
 * @param param0 DeployServiceOptions
 * @returns Promise<Error | DeployedServiceConfig>
 */
const deployService = async ({
  name,
  peerId,
  artifactsPath,
  addr,
  secretKey,
  aquaCli,
  timeout,
}: DeployServiceOptions): Promise<Error | DeployedServiceConfig> => {
  let result: string;
  try {
    result = await aquaCli.run(
      {
        command: "remote deploy_service",
        flags: {
          "config-path": path.join(
            artifactsPath,
            name,
            DEPLOYMENT_CONFIG_FILE_NAME
          ),
          service: name,
          addr,
          sk: secretKey,
          on: peerId,
          timeout,
        },
      },
      "Deploying service",
      { name, on: peerId, relay: addr }
    );
  } catch (error) {
    return new Error(`Wasn't able to deploy service\n${String(error)}`);
  }

  const [, blueprintId] = /Blueprint id:\n(.*)/.exec(result) ?? [];
  const [, serviceId] = /And your service id is:\n"(.*)"/.exec(result) ?? [];
  if (blueprintId === undefined || serviceId === undefined) {
    return new Error(
      `Deployment finished without errors but not able to parse serviceId or blueprintId from aqua cli output:\n\n${result}`
    );
  }

  return { blueprintId, serviceId, peerId, name };
};

/**
 * Deploy a service and then deploy zero or more services using the blueprint
 * id of the first service that was deployed
 * @param param0 Readonly<{ deployServiceOptions: DeployServiceOptions; count: number;}>
 * @returns Promise<Array<Error | DeployedServiceConfig>>
 */
const deployServices = async ({
  count,
  deployServiceOptions,
}: Readonly<{
  deployServiceOptions: DeployServiceOptions;
  count: number;
}>): Promise<Array<Error | DeployedServiceConfig>> => {
  const result = await deployService(deployServiceOptions);

  if (result instanceof Error || count === 1) {
    return [result];
  }

  const { blueprintId } = result;
  const { secretKey, peerId, addr, aquaCli, name, timeout } =
    deployServiceOptions;

  const deployedServiceConfigs: Array<DeployedServiceConfig | Error> = [result];

  let servicesToDeployCount = count - 1;

  // deploy by blueprintId 'servicesToDeployCount' number of times
  while (servicesToDeployCount > 0) {
    let result: string;
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await aquaCli.run(
        {
          command: "remote create_service",
          flags: {
            id: blueprintId,
            addr,
            sk: secretKey,
            on: peerId,
            timeout,
          },
        },
        "Deploying service",
        {
          name,
          blueprintId,
          on: peerId,
          relay: addr,
        }
      );
    } catch (error) {
      deployedServiceConfigs.push(
        new Error(`Wasn't able to deploy service\n${String(error)}`)
      );
      continue;
    }

    const [, serviceId] = /"(.*)"/.exec(result) ?? [];

    if (serviceId === undefined) {
      deployedServiceConfigs.push(
        new Error(
          `Deployment finished without errors but not able to parse serviceId from aqua cli output:\n\n${result}`
        )
      );
      continue;
    }

    deployedServiceConfigs.push({ blueprintId, serviceId, peerId, name });
    servicesToDeployCount = servicesToDeployCount - 1;
  }

  return deployedServiceConfigs;
};

const deploy = async ({
  deploymentConfig,
  keyPair,
  commandObj,
  timeout,
}: {
  deploymentConfig: DeploymentConfig;
  keyPair: ConfigKeyPair;
  timeout: string | undefined;
  commandObj: CommandObj;
}): Promise<Deployed> => {
  const artifactsPath = getArtifactsPath();
  const aquaCli = new AquaCLI(commandObj);
  const successfullyDeployedServices: DeployedServiceConfig[] = [];
  const cwd = process.cwd();

  for (const { name, peerId, count = 1 } of deploymentConfig.services) {
    process.chdir(path.join(artifactsPath, name));
    const addr = getRelayAddr(peerId, deploymentConfig.knownRelays);
    // eslint-disable-next-line no-await-in-loop
    const results = await deployServices({
      count,
      deployServiceOptions: {
        name,
        peerId,
        artifactsPath,
        secretKey: keyPair.secretKey,
        aquaCli,
        timeout,
        addr,
      },
    });

    for (const result of results) {
      if (result instanceof Error) {
        commandObj.warn(result.message);
        continue;
      }

      successfullyDeployedServices.push(result);
    }
  }

  process.chdir(cwd);

  if (successfullyDeployedServices.length === 0) {
    commandObj.error("No services were deployed successfully");
  }

  const newDeployed: Deployed = {
    name: deploymentConfig.name,
    services: successfullyDeployedServices,
    keyPairName: keyPair.name,
    timestamp: new Date().toISOString(),
  };

  if (Array.isArray(deploymentConfig.knownRelays)) {
    newDeployed.knownRelays = deploymentConfig.knownRelays;
  }

  return newDeployed;
};

/**
 * Ensures valid deployment config
 * @param deploymentConfigName string | undefined
 * @param commandObj CommandObj
 * @returns Promise<DeploymentConfig>
 */
const ensureDeploymentConfig = async (
  deploymentConfigName: string | undefined,
  commandObj: CommandObj
): Promise<DeploymentConfig> => {
  const projectConfig = await initReadonlyProjectConfig(commandObj);

  // Return default config
  if (deploymentConfigName === undefined) {
    const defaultConfig = projectConfig.deploymentConfigs.find(
      ({ name }): boolean => name === projectConfig.defaultDeploymentConfigName
    );
    assert(defaultConfig !== undefined);
    return defaultConfig;
  }

  // Try to find config by name
  const maybeDeploymentConfig = projectConfig.deploymentConfigs.find(
    (deploymentConfig): boolean =>
      deploymentConfig.name === deploymentConfigName
  );

  if (maybeDeploymentConfig !== undefined) {
    return maybeDeploymentConfig;
  }

  commandObj.warn(
    `There is no ${color.yellow(deploymentConfigName)} deployment config`
  );

  // Prompt user to choose valid config
  return list({
    message: "Select one of the existing deployment configs",
    choices: projectConfig.deploymentConfigs.map(
      (value): { value: DeploymentConfig; name: string } => ({
        value,
        name: value.name,
      })
    ),
    oneChoiceMessage: (name): string =>
      `Maybe you want to deploy ${color.yellow(name)}?`,
    onNoChoices: (): never => {
      commandObj.error("There are no other deployment configs");
    },
  });
};
