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

import { Command, Flags } from "@oclif/core";

import { AquaCLI, initAquaCli } from "../lib/aquaCli";
import {
  DeployedServiceConfig,
  initAppConfig,
  initNewReadonlyAppConfig,
} from "../lib/configs/project/app";
import {
  FluenceConfigReadonly,
  initReadonlyFluenceConfig,
} from "../lib/configs/project/fluence";
import {
  CommandObj,
  DEPLOYMENT_CONFIG_FILE_NAME,
  KEY_PAIR_FLAG,
  NAME_ARG,
} from "../lib/const";
import { usage } from "../lib/helpers/usage";
import type { ConfigKeyPair } from "../lib/keyPairs/generateKeyPair";
import { getKeyPairFromFlags } from "../lib/keyPairs/getKeyPair";
import { getRandomRelayId, getRelayAddr } from "../lib/multiaddr";
import { getArtifactsPath } from "../lib/pathsGetters/getArtifactsPath";
import { confirm, input } from "../lib/prompt";

import { removeApp } from "./remove";

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
    const { flags, args } = await this.parse(Deploy);

    const deployedConfig = await initAppConfig(this);

    if (deployedConfig !== null) {
      // Prompt user to remove previously deployed app if
      // it was already deployed before
      const doRemove = await confirm({
        message:
          "Currently you need to remove your app to deploy again. Do you want to remove?",
      });

      if (!doRemove) {
        this.error("You have to confirm in order to continue");
      }

      await removeApp({
        appConfig: deployedConfig,
        commandObj: this,
        timeout: flags.timeout,
      });
    }

    const keyPair = await getKeyPairFromFlags(flags, this);
    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }
    const nameArg: unknown = args[NAME_ARG];
    assert(nameArg === undefined || typeof nameArg === "string");

    const fluenceConfig = await initReadonlyFluenceConfig(this);

    await deploy({
      fluenceConfig,
      commandObj: this,
      keyPair,
      timeout: flags.timeout,
    });
  }
}

type DeployServiceOptions = Readonly<{
  name: string;
  peerId: string;
  artifactsPath: string;
  addr: string;
  secretKey: string;
  aquaCli: AquaCLI;
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
    result = await aquaCli(
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
      result = await aquaCli(
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
  fluenceConfig,
  keyPair,
  commandObj,
  timeout,
}: {
  fluenceConfig: FluenceConfigReadonly;
  keyPair: ConfigKeyPair;
  timeout: string | undefined;
  commandObj: CommandObj;
}): Promise<void> => {
  const artifactsPath = getArtifactsPath();
  const cwd = process.cwd();
  const peerId = (await confirm({
    message: "Do you want to enter peerId to deploy on?",
    default: false,
  }))
    ? await input({ message: "Enter peerId to deploy on" })
    : getRandomRelayId();
  const addr = getRelayAddr(peerId);

  const aquaCli = await initAquaCli(commandObj);
  const successfullyDeployedServices: DeployedServiceConfig[] = [];
  for (const { name, count = 1 } of fluenceConfig.services) {
    process.chdir(path.join(artifactsPath, name));
    // eslint-disable-next-line no-await-in-loop
    const results = await deployServices({
      count,
      deployServiceOptions: {
        name,
        artifactsPath,
        secretKey: keyPair.secretKey,
        aquaCli,
        peerId,
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

  await initNewReadonlyAppConfig(
    {
      version: 0,
      services: successfullyDeployedServices,
      keyPairName: keyPair.name,
      timestamp: new Date().toISOString(),
    },
    commandObj
  );
};
