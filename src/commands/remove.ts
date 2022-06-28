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

import { Command } from "@oclif/core";

import { initAquaCli } from "../lib/aquaCli";
import { AppConfig, initAppConfig, Services } from "../lib/configs/project/app";
import { CommandObj, NO_INPUT_FLAG, TIMEOUT_FLAG } from "../lib/const";
import { updateDeployedAppAqua } from "../lib/deployedApp";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { usage } from "../lib/helpers/usage";
import { getKeyPair } from "../lib/keyPairs/getKeyPair";
import { getRandomRelayAddr } from "../lib/multiaddr";
import { getDeployedAppAquaPath } from "../lib/pathsGetters/getDefaultAquaPath";
import { ensureProjectFluenceDirPath } from "../lib/pathsGetters/getProjectFluenceDirPath";
import { confirm } from "../lib/prompt";

export default class Remove extends Command {
  static override description = "Remove previously deployed config";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...TIMEOUT_FLAG,
    ...NO_INPUT_FLAG,
  };
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { flags } = await this.parse(Remove);
    const isInteractive = getIsInteractive(flags);
    await ensureProjectFluenceDirPath(this, isInteractive);

    const appConfig = await initAppConfig(this);

    if (appConfig === null) {
      this.error("There is nothing to remove");
    }

    if (
      isInteractive &&
      !(await confirm({
        message: "Are you sure you want to remove your app?",
        isInteractive,
      }))
    ) {
      this.error("Aborted");
    }

    await removeApp({
      appConfig,
      commandObj: this,
      timeout: flags.timeout,
      isInteractive,
    });
  }
}

/**
 * Gets key-pair for stuff that user selected for removal
 * removes each service from the config
 * if all services removed successfully - it deletes app.yaml
 * otherwise it commits not removed services and throws an error
 * @param param0 { name: string; commandObj: CommandObj; timeout: string | undefined; deployedConfig: DeployedConfig;}
 * @returns Promise<void>
 */
export const removeApp = async ({
  commandObj,
  timeout,
  appConfig,
  isInteractive,
}: Readonly<{
  commandObj: CommandObj;
  timeout: string | undefined;
  appConfig: AppConfig;
  isInteractive: boolean;
}>): Promise<void> => {
  const { keyPairName, timestamp, services } = appConfig;
  const keyPair = await getKeyPair({ commandObj, keyPairName, isInteractive });

  if (keyPair instanceof Error) {
    commandObj.warn(
      getMessageWithKeyValuePairs(`${keyPair.message}. From config`, {
        "deployed at": timestamp,
      })
    );
    return;
  }

  const aquaCli = await initAquaCli(commandObj, isInteractive);
  const notRemovedServices: Services = {};
  const addr = getRandomRelayAddr();

  for (const [name, servicesByName] of Object.entries(services)) {
    const notRemovedServicesByName = [];

    for (const service of servicesByName) {
      const { serviceId, peerId, blueprintId } = service;
      try {
        // eslint-disable-next-line no-await-in-loop
        await aquaCli(
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
      } catch (error) {
        commandObj.warn(`When removing service\n${String(error)}`);
        notRemovedServicesByName.push(service);
      }
    }

    if (notRemovedServicesByName.length > 0) {
      notRemovedServices[name] = notRemovedServicesByName;
    }
  }

  if (Object.keys(notRemovedServices).length === 0) {
    await fsPromises.unlink(getDeployedAppAquaPath());
    return fsPromises.unlink(appConfig.$getPath());
  }

  await updateDeployedAppAqua(notRemovedServices);

  appConfig.services = notRemovedServices;
  await appConfig.$commit();
  commandObj.error(
    "Not all services were successful removed. Please make sure to remove all of them in order to continue"
  );
};
