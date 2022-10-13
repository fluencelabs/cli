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
import fsPromises from "node:fs/promises";

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";
import { yamlDiffPatch } from "yaml-diff-patch";

import { AquaCLI, initAquaCli } from "../lib/aquaCli";
import {
  AppConfig,
  initAppConfig,
  ServicesV3,
} from "../lib/configs/project/app";
import {
  initFluenceConfig,
  initReadonlyFluenceConfig,
} from "../lib/configs/project/fluence";
import { CommandObj, NO_INPUT_FLAG, TIMEOUT_FLAG } from "../lib/const";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp";
import { ensureFluenceProject } from "../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import {
  ConfigKeyPair,
  getProjectKeyPair,
  getUserKeyPair,
} from "../lib/keypairs";
import { getRandomRelayAddr } from "../lib/multiaddr";
import {
  ensureFluenceJSAppPath,
  ensureFluenceTSAppPath,
  ensureFluenceAquaDeployedAppPath,
  ensureFluenceJSDeployedAppPath,
  ensureFluenceTSDeployedAppPath,
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
  async run(): Promise<void> {
    const { flags } = await this.parse(Remove);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    const appConfig = await initAppConfig(this);

    if (appConfig === null || Object.keys(appConfig.services).length === 0) {
      this.error(
        "Seems like project is not currently deployed. Nothing to remove"
      );
    }

    if (
      isInteractive && // when isInteractive is false - removeApp without asking
      !(await confirm({
        message: `Are you sure you want to remove app described in ${color.yellow(
          replaceHomeDir(appConfig.$getPath())
        )}?`,
        isInteractive,
      }))
    ) {
      this.error("Aborted");
    }

    const fluenceConfig = await initFluenceConfig(this);
    const aquaCli = await initAquaCli(this, fluenceConfig);

    await removeApp({
      appConfig,
      commandObj: this,
      timeout: flags.timeout,
      relay: flags.relay,
      isInteractive,
      aquaCli,
    });
  }
}

export const removeApp = async (
  removeAppArg: Readonly<{
    commandObj: CommandObj;
    timeout: number | undefined;
    appConfig: AppConfig;
    isInteractive: boolean;
    aquaCli: AquaCLI;
    relay?: string | undefined;
  }>
): Promise<AppConfig | null> => {
  const { commandObj, timeout, appConfig, isInteractive, relay, aquaCli } =
    removeAppArg;

  const isRemovingAll = isInteractive
    ? await confirm({
        isInteractive,
        message: `\n\nCurrently deployed services described in ${color.yellow(
          replaceHomeDir(appConfig.$getPath())
        )}:\n\n${yamlDiffPatch(
          "",
          {},
          appConfig.services
        )}\n\nDo you want to remove all of them?`,
      })
    : true;

  const { services, relays } = appConfig;
  const notRemovedServices: ServicesV3 = {};
  const addr = relay ?? getRandomRelayAddr(relays);

  const allKeyPairNames = [
    ...new Set(
      Object.entries(services).flatMap(
        ([, servicesByName]): Array<string> =>
          Object.entries(servicesByName).flatMap(
            ([, services]): Array<string> =>
              services.map(({ keyPairName }): string => keyPairName)
          )
      )
    ),
  ];

  const keyPairsMap = new Map(
    await Promise.all(
      allKeyPairNames.map(
        (keyPairName): Promise<[string, ConfigKeyPair]> =>
          (async (): Promise<[string, ConfigKeyPair]> => {
            const keyPair =
              (await getProjectKeyPair({ commandObj, keyPairName })) ??
              (await getUserKeyPair({ commandObj, keyPairName }));

            if (keyPair === undefined) {
              return commandObj.error(`Key-pair ${keyPairName} not found`);
            }

            return [keyPairName, keyPair];
          })()
      )
    )
  );

  for (const [serviceName, servicesByName] of Object.entries(services)) {
    const notRemovedServicesByName: typeof servicesByName = {};

    for (const [deployId, services] of Object.entries(servicesByName)) {
      for (const service of services) {
        const { serviceId, peerId, keyPairName } = service;
        const keyPair = keyPairsMap.get(keyPairName);
        assert(keyPair !== undefined);

        const keyValuePairs = {
          service: serviceName,
          deployId,
          peerId,
          serviceId,
        };

        const handleNotRemovedService = (): void => {
          notRemovedServicesByName[deployId] = [
            ...(notRemovedServicesByName[deployId] ?? []),
            service,
          ];
        };

        if (
          !isRemovingAll &&
          // eslint-disable-next-line no-await-in-loop
          !(await confirm({
            isInteractive,
            message: getMessageWithKeyValuePairs(
              "Do you want to remove",
              keyValuePairs
            ),
          }))
        ) {
          handleNotRemovedService();
          continue;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          await aquaCli(
            {
              args: ["remote", "remove_service"],
              flags: {
                addr,
                id: serviceId,
                sk: keyPair.secretKey,
                on: peerId,
                timeout,
              },
            },
            "Removing",
            keyValuePairs
          );
        } catch (error) {
          commandObj.warn(`When removing service\n${String(error)}`);
          handleNotRemovedService();
        }
      }
    }

    if (Object.keys(notRemovedServicesByName).length > 0) {
      notRemovedServices[serviceName] = notRemovedServicesByName;
    }
  }

  const fluenceConfig = await initReadonlyFluenceConfig(commandObj);

  if (Object.keys(notRemovedServices).length === 0) {
    const pathsToRemove = [
      await ensureFluenceAquaDeployedAppPath(),
      ...(typeof fluenceConfig?.appTSPath === "string"
        ? [
            ensureFluenceTSAppPath(fluenceConfig.appTSPath),
            ensureFluenceTSDeployedAppPath(fluenceConfig.appTSPath),
          ]
        : []),
      ...(typeof fluenceConfig?.appJSPath === "string"
        ? [
            ensureFluenceJSAppPath(fluenceConfig.appJSPath),
            ensureFluenceJSDeployedAppPath(fluenceConfig.appJSPath),
          ]
        : []),
      appConfig.$getPath(),
    ];

    await Promise.allSettled(
      pathsToRemove.map((path): Promise<void> => fsPromises.unlink(path))
    );

    return null;
  }

  await generateDeployedAppAqua(notRemovedServices);

  await generateRegisterApp({
    deployedServices: notRemovedServices,
    aquaCli,
    fluenceConfig,
  });

  appConfig.services = notRemovedServices;
  await appConfig.$commit();

  if (
    await confirm({
      isInteractive,
      message: `\n\nNot removed services described in ${color.yellow(
        replaceHomeDir(appConfig.$getPath())
      )}:\n\n${yamlDiffPatch(
        "",
        {},
        notRemovedServices
      )}\n\nAre there any of them that you still want to remove?`,
      default: false,
    })
  ) {
    return removeApp({ ...removeAppArg, appConfig });
  }

  return appConfig;
};
