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

import { Command, Flags } from "@oclif/core";

import { initAquaCli } from "../lib/aquaCli";
import {
  AppConfig,
  initAppConfig,
  ServicesV2,
} from "../lib/configs/project/app";
import { CommandObj, NO_INPUT_FLAG, TIMEOUT_FLAG } from "../lib/const";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp";
import { ensureFluenceProject } from "../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { usage } from "../lib/helpers/usage";
import { getKeyPair } from "../lib/keypairs";
import { getRandomRelayAddr } from "../lib/multiaddr";
import {
  ensureAppJSPath,
  ensureAppTSPath,
  ensureDeployedAppAquaPath,
  ensureDeployedAppJSPath,
  ensureDeployedAppTSPath,
} from "../lib/paths";
import { confirm } from "../lib/prompt";

export default class Remove extends Command {
  static override description = "Remove previously deployed config";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    relay: Flags.string({
      description: "Relay node multiaddr",
      helpValue: "<multiaddr>",
    }),
    ...TIMEOUT_FLAG,
    ...NO_INPUT_FLAG,
  };
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { flags } = await this.parse(Remove);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    const appConfig = await initAppConfig(this);

    if (appConfig === null) {
      this.error("There is nothing to remove");
    }

    if (
      isInteractive && // when isInteractive is false - removeApp without asking
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
      relay: flags.relay,
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
  relay,
}: Readonly<{
  commandObj: CommandObj;
  timeout: string | undefined;
  appConfig: AppConfig;
  isInteractive: boolean;
  relay: string | undefined;
}>): Promise<void> => {
  const { keyPairName, timestamp, services, relays } = appConfig;
  const keyPair = await getKeyPair({ commandObj, keyPairName, isInteractive });
  const aquaCli = await initAquaCli(commandObj);
  const notRemovedServices: ServicesV2 = {};
  const addr = relay ?? getRandomRelayAddr(relays);

  for (const [serviceName, servicesByName] of Object.entries(services)) {
    const notRemovedServicesByName: typeof servicesByName = {};
    for (const [deployName, services] of Object.entries(servicesByName)) {
      for (const service of services) {
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
              name: serviceName,
              id: serviceId,
              blueprintId,
              relay: addr,
              "deployed on": peerId,
              "deployed at": timestamp,
            }
          );
        } catch (error) {
          commandObj.warn(`When removing service\n${String(error)}`);
          notRemovedServicesByName[deployName] = [
            ...(notRemovedServicesByName[deployName] ?? []),
            service,
          ];
        }
      }
    }

    if (Object.keys(notRemovedServicesByName).length > 0) {
      notRemovedServices[serviceName] = notRemovedServicesByName;
    }
  }

  if (Object.keys(notRemovedServices).length === 0) {
    const pathsToRemove = await Promise.all([
      ensureDeployedAppAquaPath(),
      ensureAppTSPath(),
      ensureAppJSPath(),
      ensureDeployedAppTSPath(),
      ensureDeployedAppJSPath(),
      Promise.resolve(appConfig.$getPath()),
    ]);

    await Promise.allSettled(
      pathsToRemove.map((path): Promise<void> => fsPromises.unlink(path))
    );
    return;
  }

  await generateDeployedAppAqua(notRemovedServices);
  await generateRegisterApp({
    deployedServices: notRemovedServices,
    aquaCli,
  });

  appConfig.services = notRemovedServices;
  await appConfig.$commit();
  commandObj.error(
    "Not all services were successful removed. Please make sure to remove all of them in order to continue"
  );
};
