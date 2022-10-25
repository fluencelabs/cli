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

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";
import camelcase from "camelcase";

import { initFluenceConfig } from "../../lib/configs/project/fluence";
import { initNewReadonlyServiceConfig } from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  NAME_FLAG_NAME,
  NO_INPUT_FLAG,
} from "../../lib/const";
import {
  AQUA_NAME_REQUIREMENTS,
  ensureValidAquaName,
  validateAquaName,
} from "../../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { confirm, input } from "../../lib/prompt";
import { generateNewModule } from "../module/new";

import { addService } from "./add";

const PATH = "PATH";

export default class New extends Command {
  static override description = "Create new marine service template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    [NAME_FLAG_NAME]: Flags.string({
      description: `Unique service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
  };
  static override args = [
    {
      name: PATH,
      description: "Path to a service",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(New);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);
    const fluenceConfig = await initFluenceConfig(this);

    if (fluenceConfig === null) {
      this.error("Unreachable. Not a Fluence project");
    }

    const servicePath: unknown =
      args[PATH] ??
      (await input({ isInteractive, message: "Enter service path" }));

    assert(typeof servicePath === "string");

    const serviceName = await ensureValidAquaName({
      stringToValidate: await getServiceName({
        isInteractive,
        nameFromFlags: flags[NAME_FLAG_NAME],
        servicePath,
      }),
      message: "Enter service name",
      flagName: NAME_FLAG_NAME,
      isInteractive,
    });

    const pathToModuleDir = path.join(servicePath, "modules", serviceName);
    await generateNewModule(pathToModuleDir, this);

    await initNewReadonlyServiceConfig(
      servicePath,
      this,
      path.relative(servicePath, pathToModuleDir),
      serviceName
    );

    this.log(
      `Successfully generated template for new service at ${color.yellow(
        servicePath
      )}`
    );

    if (
      isInteractive &&
      (await confirm({
        isInteractive,
        message: `Do you want add ${color.yellow(
          serviceName
        )} to ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}?`,
      }))
    ) {
      await addService({
        commandObj: this,
        serviceName,
        pathOrUrl: servicePath,
        isInteractive,
        fluenceConfig,
      });
    }
  }
}

type GetServiceNameArg = {
  nameFromFlags: undefined | string;
  servicePath: string;
  isInteractive: boolean;
};

const getServiceName = async ({
  isInteractive,
  nameFromFlags,
  servicePath,
}: GetServiceNameArg): Promise<string | undefined> => {
  if (typeof nameFromFlags === "string") {
    return nameFromFlags;
  }

  const withoutTrailingSlash = servicePath.replace(/\/$/, "");

  const lastPortionOfPath =
    withoutTrailingSlash
      .split(withoutTrailingSlash.includes("/") ? "/" : "\\")
      .slice(-1)[0] ?? "";

  const cleanLastPortionOfPath = lastPortionOfPath.replace(/\W/g, "");
  const camelCasedServiceName = camelcase(cleanLastPortionOfPath);
  const serviceNameValidity = validateAquaName(camelCasedServiceName);

  if (
    serviceNameValidity !== true ||
    !(await confirm({
      isInteractive,
      message: `Do you want to use ${color.yellow(
        camelCasedServiceName
      )} as the name of your new service?`,
    }))
  ) {
    return undefined;
  }

  return camelCasedServiceName;
};
