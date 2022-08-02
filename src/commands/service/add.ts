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

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";
import camelcase from "camelcase";

import { initFluenceConfig } from "../../lib/configs/project/fluence";
import {
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  NO_INPUT_FLAG,
} from "../../lib/const";
import { stringToCamelCaseName } from "../../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { input } from "../../lib/prompt";

const PATH_OR_URL = "PATH | URL";
const NAME_FLAG_NAME = "name";

export default class Add extends Command {
  static override description = `Add service to ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    [NAME_FLAG_NAME]: Flags.string({
      description: "Unique service name",
      helpValue: "<name>",
    }),
  };
  static override args = [
    {
      name: PATH_OR_URL,
      description: "Path to a service or url to .tar.gz archive",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Add);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);
    const pathOrUrlFromArgs: unknown = args[PATH_OR_URL];
    assert(
      typeof pathOrUrlFromArgs === "string" ||
        typeof pathOrUrlFromArgs === "undefined"
    );
    await addService({
      commandObj: this,
      nameFromFlags: flags[NAME_FLAG_NAME],
      pathOrUrl:
        pathOrUrlFromArgs ??
        (await input({ isInteractive, message: "Enter service path or url" })),
    });
  }
}

type AddServiceArg = {
  commandObj: CommandObj;
  nameFromFlags: string | undefined;
  pathOrUrl: string;
};

export const addService = async ({
  commandObj,
  nameFromFlags,
  pathOrUrl: pathOrUrlFromArgs,
}: AddServiceArg): Promise<void> => {
  const fluenceConfig = await initFluenceConfig(commandObj);
  if (fluenceConfig === null) {
    return commandObj.error(
      "You must init Fluence project first to add services"
    );
  }
  if (fluenceConfig.services === undefined) {
    fluenceConfig.services = {};
  }
  const serviceName = nameFromFlags ?? stringToCamelCaseName(pathOrUrlFromArgs);
  if (camelcase(serviceName) !== serviceName) {
    commandObj.error(
      `Service name ${color.yellow(
        serviceName
      )} not in camelCase. Please use ${color.yellow(
        `--${NAME_FLAG_NAME}`
      )} flag to specify service name`
    );
  }
  if (serviceName in fluenceConfig.services) {
    commandObj.error(
      `You already have ${color.yellow(serviceName)} in ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}. Provide a unique name for the new service using ${color.yellow(
        `--${NAME_FLAG_NAME}`
      )} flag or edit the existing service in ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )} manually`
    );
  }
  fluenceConfig.services = {
    ...fluenceConfig.services,
    [serviceName]: {
      get: pathOrUrlFromArgs,
      deploy: [
        {
          deployId: DEFAULT_DEPLOY_NAME,
        },
      ],
    },
  };
  await fluenceConfig.$commit();
  commandObj.log(
    `Added ${color.yellow(serviceName)} to ${color.yellow(
      FLUENCE_CONFIG_FILE_NAME
    )}`
  );
};
