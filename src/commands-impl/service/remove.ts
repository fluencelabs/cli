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
import { cwd } from "node:process";

import { color } from "@oclif/color";

import type Remove from "../../commands/service/remove.js";
import { commandObj } from "../../lib/commandObj.js";
import type { FluenceConfigReadonly } from "../../lib/configs/project/fluence.js";
import { getServiceAbsolutePath } from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export async function removeImpl(
  this: Remove,
  command: typeof Remove,
): Promise<void> {
  const { args, fluenceConfig } = await initCli(
    this,
    await this.parse(command),
    true,
  );

  const nameOrPathOrUrl =
    args[NAME_OR_PATH_OR_URL] ??
    (await input({
      message: `Enter service name from ${color.yellow(
        fluenceConfig.$getPath(),
      )}, path to a service or url to .tar.gz archive`,
    }));

  const serviceNameToRemove = await getServiceNameToRemove(
    nameOrPathOrUrl,
    fluenceConfig,
  );

  assert(fluenceConfig.services !== undefined);
  delete fluenceConfig.services[serviceNameToRemove];

  if (fluenceConfig.workers !== undefined) {
    fluenceConfig.workers = Object.fromEntries(
      Object.entries(fluenceConfig.workers).map(([workerName, worker]) => {
        return [
          workerName,
          {
            ...worker,
            ...(worker.services === undefined
              ? {}
              : {
                  services: worker.services.filter((service) => {
                    return service !== serviceNameToRemove;
                  }),
                }),
          },
        ];
      }),
    );
  }

  await fluenceConfig.$commit();

  commandObj.log(
    `Removed service ${color.yellow(nameOrPathOrUrl)} from ${color.yellow(
      fluenceConfig.$getPath(),
    )}`,
  );
}

const getServiceNameToRemove = async (
  nameOrPathOrUrl: string,
  fluenceConfig: FluenceConfigReadonly,
): Promise<string> => {
  if (fluenceConfig.services === undefined) {
    return commandObj.error(
      `There are no services in ${color.yellow(fluenceConfig.$getPath())}`,
    );
  }

  if (nameOrPathOrUrl in fluenceConfig.services) {
    return nameOrPathOrUrl;
  }

  const servicesAbsolutePathsWithNames = await Promise.all(
    Object.entries(fluenceConfig.services).map(async ([name, { get }]) => {
      return [
        name,
        await getServiceAbsolutePath(get, fluenceConfig.$getDirPath()),
      ] as const;
    }),
  );

  const absolutePathRelativeToService = await getServiceAbsolutePath(
    nameOrPathOrUrl,
    fluenceConfig.$getDirPath(),
  );

  let [moduleNameToRemove] =
    servicesAbsolutePathsWithNames.find(([, absolutePath]) => {
      return absolutePath === absolutePathRelativeToService;
    }) ?? [];

  if (moduleNameToRemove !== undefined) {
    return moduleNameToRemove;
  }

  const absolutePathRelativeToCwd = await getServiceAbsolutePath(
    nameOrPathOrUrl,
    cwd(),
  );

  [moduleNameToRemove] =
    servicesAbsolutePathsWithNames.find(([, absolutePath]) => {
      return absolutePath === absolutePathRelativeToCwd;
    }) ?? [];

  if (moduleNameToRemove !== undefined) {
    return moduleNameToRemove;
  }

  return commandObj.error(
    `There is no service ${color.yellow(nameOrPathOrUrl)} in ${color.yellow(
      fluenceConfig.$getPath(),
    )}`,
  );
};
