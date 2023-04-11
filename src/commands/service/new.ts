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

import path from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";
import camelcase from "camelcase";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { addService } from "../../lib/addService.js";
import { isInteractive } from "../../lib/commandObj.js";
import { initNewReadonlyServiceConfig } from "../../lib/configs/project/service.js";
import { generateNewModule } from "../../lib/generateNewModule.js";
import {
  AQUA_NAME_REQUIREMENTS,
  cleanAquaName,
  ensureValidAquaName,
  validateAquaName,
} from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { confirm, input } from "../../lib/prompt.js";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create new marine service template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    name: Flags.string({
      description: `Unique service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
  };
  static override args = {
    path: Args.string({
      description: "Path to a service",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(New)
    );

    const servicePath =
      args.path ?? (await input({ message: "Enter service path" }));

    const serviceName = await ensureValidAquaName({
      stringToValidate: await getServiceName({
        nameFromFlags: flags.name,
        servicePath,
      }),
      message: "Enter service name",
    });

    const pathToModuleDir = path.join(servicePath, "modules", serviceName);
    await generateNewModule(pathToModuleDir);

    await initNewReadonlyServiceConfig(
      servicePath,
      path.relative(servicePath, pathToModuleDir),
      serviceName
    );

    this.log(
      `Successfully generated template for new service at ${color.yellow(
        servicePath
      )}`
    );

    if (maybeFluenceConfig !== null) {
      const marineCli = await initMarineCli(maybeFluenceConfig);

      await addService({
        marineCli,
        serviceName,
        pathOrUrl: servicePath,
        fluenceConfig: maybeFluenceConfig,
      });
    }
  }
}

type GetServiceNameArg = {
  nameFromFlags: undefined | string;
  servicePath: string;
};

const getServiceName = async ({
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

  const cleanLastPortionOfPath = cleanAquaName(lastPortionOfPath);
  const camelCasedServiceName = camelcase(cleanLastPortionOfPath);
  const serviceNameValidity = validateAquaName(camelCasedServiceName);

  if (
    serviceNameValidity !== true ||
    (isInteractive &&
      !(await confirm({
        message: `Do you want to use ${color.yellow(
          camelCasedServiceName
        )} as the name of your new service?`,
      })))
  ) {
    return undefined;
  }

  return camelCasedServiceName;
};
