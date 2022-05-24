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

import fsPromises from "node:fs/promises";
import path from "node:path";
import assert from "node:assert";

import { Command, Flags } from "@oclif/core";

import { getKeyPairFromFlags } from "../lib/keyPairs/getKeyPair";
import {
  CommandObj,
  DEPLOYMENT_CONFIG_FILE_NAME,
  ARTIFACTS_DIR_NAME,
  KEY_PAIR_FLAG,
} from "../lib/const";
import { AquaCLI, AquaCliInput } from "../lib/aquaCli";
import {
  ProjectConfig,
  DeploymentConfig,
  getProjectConfig,
} from "../lib/configs/projectConfig";
import { ensureFluenceProjectDir } from "../lib/getFluenceDir";
import { getRandomAddr, getRandomPeerId } from "../lib/multiaddr";
import { confirm, list } from "../lib/prompt";
import type {
  Deployed,
  DeployedConfig,
  DeployedServiceConfig,
} from "../lib/configs/deployedConfig";
import type { ConfigKeyPair } from "../lib/keyPairs/generateKeyPair";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { usage } from "../lib/helpers/usage";

import {
  getPreviouslyDeployedConfig,
  removePreviouslyDeployed,
} from "./remove";

const CONFIG_NAME = "config-name";

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
    { name: CONFIG_NAME, description: "Deployment config name" },
  ];

  static override usage: string = usage(this);

  async run(): Promise<void> {
    const fluenceProjectDir = await ensureFluenceProjectDir(this);

    const { flags, args } = await this.parse(Deploy);

    const keyPair = await getKeyPairFromFlags(flags, this);

    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }

    const deploymentConfig = await getDeploymentConfig(
      args[CONFIG_NAME],
      fluenceProjectDir,
      this
    );

    await deploy({
      deploymentConfig,
      commandObj: this,
      fluenceProjectDir,
      keyPair,
      timeout: flags.timeout,
    });
  }
}

const generateDefaultDeploymentConfig = async (
  commandObj: CommandObj,
  artifactsPath: string
): Promise<DeploymentConfig> => {
  const peerId = getRandomPeerId();

  try {
    await fsPromises.access(artifactsPath);
  } catch {
    commandObj.error(
      `Nothing to deploy: There is no ${artifactsPath} directory`
    );
  }

  const services = (
    await fsPromises.readdir(artifactsPath, { withFileTypes: true })
  )
    .filter((dirent): boolean => dirent.isDirectory())
    .map(({ name }): DeploymentConfig["services"][0] => ({ name, peerId }));

  if (services.length === 0) {
    commandObj.error(
      `Nothing to deploy: There are no services in the ${artifactsPath} directory`
    );
  }

  return {
    name: "auto-generated",
    services,
  };
};

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
 *
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
  const aquaCliArgs: AquaCliInput = {
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
  } as const;

  const infoKeyValuePairs = { name, on: peerId, relay: addr };

  let result: string;
  try {
    result = await aquaCli.run(
      aquaCliArgs,
      "Deploying service",
      infoKeyValuePairs
    );
  } catch (error) {
    const deploymentErrorMessage = getMessageWithKeyValuePairs(
      "\nWasn't able to deploy service",
      infoKeyValuePairs
    );

    return new Error(`${deploymentErrorMessage}\n${String(error)}`);
  }

  const [, blueprintId] = /Blueprint id:\n(.*)/.exec(result) ?? [];
  const [, serviceId] = /And your service id is:\n"(.*)"/.exec(result) ?? [];
  if (blueprintId === undefined || serviceId === undefined) {
    return new Error(
      getMessageWithKeyValuePairs(
        `Deployment process finished without errors but not able to parse serviceId or blueprintId from aqua cli output:\n\n${result}`,
        infoKeyValuePairs
      )
    );
  }

  return { blueprintId, serviceId, peerId, name };
};

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

  const infoKeyValuePairs = {
    name,
    blueprintId,
    on: peerId,
    relay: addr,
  };

  const deploymentErrorMessage = getMessageWithKeyValuePairs(
    "Wasn't able to deploy service",
    infoKeyValuePairs
  );

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
        infoKeyValuePairs
      );
    } catch (error) {
      deployedServiceConfigs.push(
        new Error(`${deploymentErrorMessage}\n${String(error)}`)
      );
      continue;
    }

    const [, serviceId] = /"(.*)"/.exec(result) ?? [];

    if (serviceId === undefined) {
      deployedServiceConfigs.push(
        new Error(
          getMessageWithKeyValuePairs(
            `Deployment process finished without errors but not able to parse serviceId from aqua cli output:\n\n${result}`,
            infoKeyValuePairs
          )
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
  fluenceProjectDir,
  commandObj,
  timeout,
}: {
  deploymentConfig: DeploymentConfig;
  keyPair: ConfigKeyPair;
  fluenceProjectDir: string;
  timeout: string | undefined;
  commandObj: CommandObj;
}): Promise<DeployedConfig> => {
  const artifactsPath = path.join(process.cwd(), ARTIFACTS_DIR_NAME);
  const aquaCli = new AquaCLI(commandObj);
  const addr = getRandomAddr(deploymentConfig.knownRelays);

  const failedDeploys: Error[] = [];
  const successfulDeploys: DeployedServiceConfig[] = [];

  for (const { name, peerId, count = 1 } of deploymentConfig.services) {
    const deployServiceOptions = {
      name,
      peerId,
      artifactsPath,
      secretKey: keyPair.secretKey,
      aquaCli,
      timeout,
      addr,
    };
    // eslint-disable-next-line no-await-in-loop
    const results = await deployServices({
      count,
      deployServiceOptions,
    });

    for (const result of results) {
      if (result instanceof Error) {
        failedDeploys.push(result);
        continue;
      }

      successfulDeploys.push(result);
    }
  }

  for (const error of failedDeploys) {
    commandObj.warn(error.message);
  }

  if (successfulDeploys.length === 0) {
    commandObj.error("No services were deployed successfully");
  }

  const newDeployed: Deployed = {
    name: deploymentConfig.name,
    services: successfulDeploys,
    keyPairName: keyPair.name,
    timestamp: new Date().toISOString(),
  };

  if (deploymentConfig.knownRelays !== undefined) {
    newDeployed.knownRelays = deploymentConfig.knownRelays;
  }

  const { previouslyDeployedConfigs, updateDeployedConfig } =
    await getPreviouslyDeployedConfig({
      name: deploymentConfig.name,
      fluenceProjectDir,
      commandObj,
      newDeployed,
    });

  if (previouslyDeployedConfigs.length === 0) {
    return updateDeployedConfig(
      (deployedConfig): DeployedConfig => ({
        ...deployedConfig,
        deployed: [...deployedConfig.deployed, newDeployed],
      })
    );
  }

  commandObj.warn(
    `Config '${deploymentConfig.name}' was already deployed before`
  );
  const doRemove = await confirm({
    message: `Do you want to remove previously deployed services?`,
  });

  if (!doRemove) {
    return updateDeployedConfig(
      (deployedConfig): DeployedConfig => ({
        ...deployedConfig,
        deployed: [...deployedConfig.deployed, newDeployed],
      })
    );
  }

  return removePreviouslyDeployed({
    aquaCli,
    commandObj,
    fluenceProjectDir,
    name: deploymentConfig.name,
    timeout,
    newDeployed,
  });
};

const getDeploymentConfig = async (
  deploymentConfigName: string | undefined,
  fluenceProjectDir: string,
  commandObj: CommandObj
): Promise<DeploymentConfig> => {
  const projectConfigResult = await getProjectConfig(fluenceProjectDir);

  if (projectConfigResult instanceof Error) {
    commandObj.error(projectConfigResult.message);
  }

  const [projectConfig, updateProjectConfig] = projectConfigResult;

  const artifactsPath = path.join(process.cwd(), ARTIFACTS_DIR_NAME);

  if (deploymentConfigName !== undefined) {
    const maybeDeploymentConfig = projectConfig.deploymentConfigs.find(
      (deploymentConfig): boolean =>
        deploymentConfig.name === deploymentConfigName
    );

    if (maybeDeploymentConfig !== undefined) {
      return maybeDeploymentConfig;
    }

    commandObj.warn(`There is no '${deploymentConfigName}' deployment config`);

    const validDeploymentConfigName = await list({
      message: "Select a valid deployment config",
      choices: projectConfig.deploymentConfigs.map(({ name }): string => name),
    });

    const deploymentConfig = projectConfig.deploymentConfigs.find(
      (deploymentConfig): boolean =>
        deploymentConfig.name === validDeploymentConfigName
    );

    assert(deploymentConfig !== undefined);

    return deploymentConfig;
  }

  const [defaultDeploymentConfig] = projectConfig.deploymentConfigs ?? [];

  if (defaultDeploymentConfig === undefined) {
    const defaultDeploymentConfig = await generateDefaultDeploymentConfig(
      commandObj,
      artifactsPath
    );

    await updateProjectConfig(
      (config): ProjectConfig => ({
        ...config,
        deploymentConfigs: [defaultDeploymentConfig],
      })
    );

    return defaultDeploymentConfig;
  }

  return defaultDeploymentConfig;
};
