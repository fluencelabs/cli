/**
 * Copyright 2023 Fluence Labs Limited
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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { yamlDiffPatch } from "yaml-diff-patch";

import type { AquaCLI } from "../lib/aquaCli.js";
import type { ConfigKeyPair } from "../lib/configs/keyPair.js";
import type { AppConfig, ServicesV3 } from "../lib/configs/project/app.js";
import { initReadonlyFluenceConfig } from "../lib/configs/project/fluence.js";
import {
  generateDeployedAppAqua,
  generateRegisterApp,
} from "../lib/deployedApp.js";
import { getMessageWithKeyValuePairs } from "../lib/helpers/getMessageWithKeyValuePairs.js";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir.js";
import { getKeyPair } from "../lib/keyPairs.js";
import { getRandomRelayAddr } from "../lib/multiaddres.js";
import {
  ensureFluenceJSAppPath,
  ensureFluenceTSAppPath,
  ensureFluenceAquaDeployedAppPath,
  ensureFluenceJSDeployedAppPath,
  ensureFluenceTSDeployedAppPath,
} from "../lib/paths.js";
import { confirm } from "../lib/prompt.js";

import { commandObj, isInteractive } from "./commandObj.js";

export const removeApp = async (
  removeAppArg: Readonly<{
    timeout: number | undefined;
    appConfig: AppConfig;
    aquaCli: AquaCLI;
    relay?: string | undefined;
  }>
): Promise<AppConfig | null> => {
  const { timeout, appConfig, relay, aquaCli } = removeAppArg;

  const isRemovingAll = isInteractive
    ? await confirm({
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
        async (keyPairName): Promise<[string, ConfigKeyPair]> => {
          const keyPair = await getKeyPair(keyPairName);

          if (keyPair === undefined) {
            return commandObj.error(`Key-pair ${keyPairName} not found`);
          }

          return [keyPairName, keyPair];
        }
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

  const fluenceConfig = await initReadonlyFluenceConfig();

  if (Object.keys(notRemovedServices).length === 0) {
    const pathsToRemove = [
      await ensureFluenceAquaDeployedAppPath(),
      ...(typeof fluenceConfig?.appTSPath === "string"
        ? [
            await ensureFluenceTSAppPath(fluenceConfig.appTSPath),
            await ensureFluenceTSDeployedAppPath(fluenceConfig.appTSPath),
          ]
        : []),
      ...(typeof fluenceConfig?.appJSPath === "string"
        ? [
            await ensureFluenceJSAppPath(fluenceConfig.appJSPath),
            await ensureFluenceJSDeployedAppPath(fluenceConfig.appJSPath),
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
