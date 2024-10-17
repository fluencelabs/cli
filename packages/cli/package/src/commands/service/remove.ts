/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { cwd } from "node:process";

import { color } from "@oclif/color";
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  isFluenceConfigWithServices,
  type FluenceConfigWithServices,
} from "../../lib/configs/project/fluence.js";
import { FLUENCE_CONFIG_FULL_FILE_NAME } from "../../lib/const.js";
import { getServiceAbsolutePath } from "../../lib/helpers/downloadFile.js";
import { removeProperties } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { projectRootDir } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove service from ${FLUENCE_CONFIG_FULL_FILE_NAME} services property and from all of the workers`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Service name from ${FLUENCE_CONFIG_FULL_FILE_NAME}, path to a service or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { args, fluenceConfig } = await initCli(
      this,
      await this.parse(Remove),
      true,
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await input({
        message: `Enter service name from ${color.yellow(
          fluenceConfig.$getPath(),
        )}, path to a service or url to .tar.gz archive`,
      }));

    if (!isFluenceConfigWithServices(fluenceConfig)) {
      return commandObj.error(
        `There are no services in ${color.yellow(fluenceConfig.$getPath())}`,
      );
    }

    const serviceNameToRemove = await getServiceNameToRemove(
      nameOrPathOrUrl,
      fluenceConfig,
    );

    fluenceConfig.services = removeProperties(
      fluenceConfig.services,
      ([name]) => {
        return name !== serviceNameToRemove;
      },
    );

    if (fluenceConfig.deployments !== undefined) {
      fluenceConfig.deployments = Object.fromEntries(
        Object.entries(fluenceConfig.deployments).map(
          ([workerName, worker]) => {
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
          },
        ),
      );
    }

    if (fluenceConfig.hosts !== undefined) {
      fluenceConfig.hosts = Object.fromEntries(
        Object.entries(fluenceConfig.hosts).map(([workerName, worker]) => {
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
}

async function getServiceNameToRemove(
  nameOrPathOrUrl: string,
  fluenceConfig: FluenceConfigWithServices,
): Promise<string> {
  if (nameOrPathOrUrl in fluenceConfig.services) {
    return nameOrPathOrUrl;
  }

  const servicesAbsolutePathsWithNames = await Promise.all(
    Object.entries(fluenceConfig.services).map(async ([name, { get }]) => {
      return [name, await getServiceAbsolutePath(get, projectRootDir)] as const;
    }),
  );

  const absolutePathRelativeToService = await getServiceAbsolutePath(
    nameOrPathOrUrl,
    projectRootDir,
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
}
