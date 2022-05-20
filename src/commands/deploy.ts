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
import { confirm } from "../lib/prompt";
import type {
  Deployed,
  DeployedConfig,
  DeployedServiceConfig,
} from "../lib/configs/deployedConfig";
import type { ConfigKeyPair } from "../lib/keyPairs/generateKeyPair";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";

import {
  getPreviouslyDeployedConfig,
  removePreviouslyDeployed,
} from "./remove";

export default class Deploy extends Command {
  static override description = "Deploy service to the remote peer";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    config: Flags.string({
      char: "c",
      description: "Deployment config name",
    }),
    timeout: Flags.string({
      description: "Deployment and remove timeout",
    }),
    ...KEY_PAIR_FLAG,
  };

  async run(): Promise<void> {
    const fluenceProjectDir = await ensureFluenceProjectDir(this);

    const { flags } = await this.parse(Deploy);

    const keyPair = await getKeyPairFromFlags(flags, this);

    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }

    const projectConfigResult = await getProjectConfig(fluenceProjectDir);

    if (projectConfigResult instanceof Error) {
      this.error(projectConfigResult.message);
    }

    const [projectConfig, updateProjectConfig] = projectConfigResult;

    const distPath = path.join(process.cwd(), ARTIFACTS_DIR_NAME);

    if (flags.config !== undefined) {
      await deployByName({
        projectConfig,
        deploymentConfigName: flags.config,
        deployArgs: {
          timeout: flags.timeout,
          fluenceProjectDir,
          keyPair,
          distPath,
          commandObj: this,
        },
      });
      return;
    }

    const [defaultDeploymentConfig] = projectConfig.deploymentConfigs ?? [];

    if (defaultDeploymentConfig === undefined) {
      const defaultDeploymentConfig = await generateDefaultDeploymentConfig(
        this,
        fluenceProjectDir,
        distPath
      );

      await updateProjectConfig(
        (config): ProjectConfig => ({
          ...config,
          deploymentConfigs: [defaultDeploymentConfig],
        })
      );

      await deploy({
        deploymentConfig: defaultDeploymentConfig,
        keyPair,
        distPath,
        fluenceProjectDir,
        commandObj: this,
        timeout: flags.timeout,
      });

      return;
    }

    await deploy({
      deploymentConfig: defaultDeploymentConfig,
      keyPair,
      distPath,
      fluenceProjectDir,
      commandObj: this,
      timeout: flags.timeout,
    });
  }
}

const generateDefaultDeploymentConfig = async (
  commandObj: CommandObj,
  fluenceProjectDir: string,
  distPath: string
): Promise<DeploymentConfig> => {
  const peerId = getRandomPeerId();

  try {
    await fsPromises.access(distPath);
  } catch {
    commandObj.error(`Nothing to deploy: There is no ${distPath} directory`);
  }

  const services = (await fsPromises.readdir(distPath, { withFileTypes: true }))
    .filter((dirent): boolean => dirent.isDirectory())
    .map(({ name }): DeploymentConfig["services"][0] => ({ name, peerId }));

  if (services.length === 0) {
    commandObj.error(
      `Nothing to deploy: There are no services in the ${fluenceProjectDir} directory`
    );
  }

  return {
    name: "auto-generated",
    services,
  };
};

const deployService = async ({
  name,
  peerId,
  distPath,
  addr,
  secretKey,
  aquaCli,
  timeout,
}: Readonly<{
  name: string;
  peerId: string;
  distPath: string;
  addr: string;
  secretKey: string;
  aquaCli: Readonly<AquaCLI>;
  timeout: string | undefined;
}>): Promise<Error | DeployedServiceConfig> => {
  const aquaCliArgs: AquaCliInput = {
    command: "remote deploy_service",
    flags: {
      "config-path": path.join(distPath, name, DEPLOYMENT_CONFIG_FILE_NAME),
      service: name,
      addr,
      sk: secretKey,
      on: peerId,
      timeout,
    },
  } as const;

  const infoKeyValuePairs = { name, on: peerId, via: addr };

  let result: string;
  try {
    result = await aquaCli.run(
      aquaCliArgs,
      "Deploying service",
      infoKeyValuePairs
    );
  } catch (error) {
    const deploymentErrorMessage = getMessageWithKeyValuePairs(
      "\nWas't able to deploy service",
      infoKeyValuePairs
    );

    return new Error(`${deploymentErrorMessage}\n${String(error)}`);
  }

  const [, blueprintId] = /Blueprint id:\n(.*)/.exec(result) ?? [];
  const [, serviceId] = /And your service id is:\n"(.*)"/.exec(result) ?? [];
  if (blueprintId === undefined || serviceId === undefined) {
    return new Error(
      getMessageWithKeyValuePairs(
        "Service probably not deployed: didn't receive blueprintId or serviceId",
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
  deployServiceOptions: Readonly<Parameters<typeof deployService>[0]>;
  count: number;
}>): Promise<Array<Error | DeployedServiceConfig>> => {
  const result = await deployService(deployServiceOptions);

  if (result instanceof Error) {
    return [result];
  }

  const { blueprintId } = result;
  const { secretKey, peerId, addr, aquaCli, name, timeout } =
    deployServiceOptions;

  const deployedServiceConfigs: Array<DeployedServiceConfig | Error> = [result];

  let timesToDeploy = count - 1;

  const infoKeyValuePairs = {
    name,
    blueprintId,
    on: peerId,
    via: addr,
  };

  const deploymentErrorMessage = getMessageWithKeyValuePairs(
    "Was't able to deploy service",
    infoKeyValuePairs
  );

  while (timesToDeploy > 0) {
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
            "Service probably not deployed: didn't receive serviceId after deployment",
            infoKeyValuePairs
          )
        )
      );
      continue;
    }

    deployedServiceConfigs.push({ blueprintId, serviceId, peerId, name });
    timesToDeploy--;
  }

  return deployedServiceConfigs;
};

const updateDeployedConfig = async ({
  deploymentConfig,
  fluenceProjectDir,
  successfulDeploys,
  aquaCli,
  commandObj,
  keyPairName,
  timeout,
}: Readonly<{
  deploymentConfig: Readonly<DeploymentConfig>;
  fluenceProjectDir: string;
  successfulDeploys: DeployedServiceConfig[];
  aquaCli: AquaCLI;
  commandObj: CommandObj;
  keyPairName: string;
  timeout: string | undefined;
}>): Promise<DeployedConfig> => {
  const newDeployed: Deployed = {
    name: deploymentConfig.name,
    services: successfulDeploys,
    keyPairName,
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

const deploy = async ({
  deploymentConfig,
  keyPair,
  distPath,
  fluenceProjectDir,
  commandObj,
  timeout,
}: {
  deploymentConfig: DeploymentConfig;
  keyPair: ConfigKeyPair;
  distPath: string;
  fluenceProjectDir: string;
  timeout: string | undefined;
  commandObj: CommandObj;
}): Promise<void> => {
  const aquaCli = new AquaCLI(commandObj);
  const addr = getRandomAddr(deploymentConfig.knownRelays);

  const failedDeploys: Error[] = [];
  const successfulDeploys: DeployedServiceConfig[] = [];

  for (const { name, peerId, count = 1 } of deploymentConfig.services) {
    const deployServiceOptions = {
      name,
      peerId,
      distPath,
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
    return;
  }

  await updateDeployedConfig({
    commandObj,
    deploymentConfig,
    fluenceProjectDir,
    aquaCli,
    successfulDeploys,
    keyPairName: keyPair.name,
    timeout,
  });
};

const deployByName = async ({
  projectConfig,
  deploymentConfigName,
  deployArgs,
}: {
  projectConfig: Readonly<ProjectConfig>;
  deploymentConfigName: string;
  deployArgs: Readonly<Omit<Parameters<typeof deploy>[0], "deploymentConfig">>;
}): Promise<void> => {
  const deploymentConfig = projectConfig.deploymentConfigs.find(
    (deploymentConfig): boolean =>
      deploymentConfig.name === deploymentConfigName
  );

  if (deploymentConfig === undefined) {
    deployArgs.commandObj.error(
      `Can't deploy '${deploymentConfigName}': no such deployment config found in ${deployArgs.fluenceProjectDir}`
    );
    return;
  }

  await deploy({
    deploymentConfig,
    ...deployArgs,
  });
};
