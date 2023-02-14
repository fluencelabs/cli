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
import { spawn } from "node:child_process";
import fsPromises from "node:fs/promises";
import path from "node:path";

import stringifyToTOML from "@iarna/toml/stringify.js";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Command } from "@oclif/core";

import { buildModule } from "../../lib/build.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import { initReadonlyFluenceConfig } from "../../lib/configs/project/fluence.js";
import { initFluenceLockConfig } from "../../lib/configs/project/fluenceLock.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  ModuleV0 as ServiceModule,
} from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FILE_NAME,
  FS_OPTIONS,
  MREPL_CARGO_DEPENDENCY,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const.js";
import { haltCountly } from "../../lib/countly.js";
import {
  downloadService,
  getModuleWasmPath,
  isUrl,
} from "../../lib/helpers/downloadFile.js";
import { startSpinner, stopSpinner } from "../../lib/helpers/spinner.js";
import { initCli } from "../../lib/lifecyle.js";
import { initMarineCli, MarineCLI } from "../../lib/marineCli.js";
import { ensureFluenceTmpConfigTomlPath } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";
import { ensureCargoDependency } from "../../lib/rust.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class REPL extends Command {
  static override description =
    "Open service inside repl (downloads and builds modules if necessary)";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Service name from ${FLUENCE_CONFIG_FILE_NAME}, path to a service or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { args, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(REPL)
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await input({
        message: `Enter service name from ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}, path to a service or url to .tar.gz archive`,
      }));

    startSpinner("Making sure service and modules are downloaded and built");

    const { serviceModules, serviceDirPath } = await ensureServiceConfig({
      nameOrPathOrUrl,
    });

    const maybeFluenceLockConfig = await initFluenceLockConfig();

    const marineCli = await initMarineCli(
      maybeFluenceConfig,
      maybeFluenceLockConfig
    );

    const moduleConfigs = await ensureModuleConfigs({
      serviceModules,
      marineCli,
      serviceDirPath,
    });

    stopSpinner();

    const fluenceTmpConfigTomlPath = await ensureFluenceTmpConfigTomlPath();

    await fsPromises.writeFile(
      fluenceTmpConfigTomlPath,
      stringifyToTOML({ module: moduleConfigs }),
      FS_OPTIONS
    );

    const facadeModuleConfig = moduleConfigs.at(-1);

    assert(
      facadeModuleConfig !== undefined,
      "Unreachable: no modules in the service"
    );

    if (!isInteractive) {
      return;
    }

    const mreplPath = await ensureCargoDependency({
      nameAndVersion: MREPL_CARGO_DEPENDENCY,
      maybeFluenceConfig,
      maybeFluenceLockConfig,
    });

    this.log(`
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Execute ${color.yellow("help")} inside repl to see available commands.
Current service <module_name> is: ${color.yellow(facadeModuleConfig.name)}
Call ${facadeModuleConfig.name} service functions in repl like this:

${color.yellow(
  `call ${facadeModuleConfig.name} <function_name> [<arg1>, <arg2>]`
)}

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    `);

    await haltCountly();

    spawn(mreplPath, [fluenceTmpConfigTomlPath], {
      stdio: "inherit",
      detached: true,
    });
  }
}

type EnsureServiceConfigArg = {
  nameOrPathOrUrl: string;
};

const ensureServiceConfig = async ({
  nameOrPathOrUrl,
}: EnsureServiceConfigArg): Promise<{
  serviceModules: Array<ServiceModule>;
  serviceDirPath: string;
}> => {
  const fluenceConfig = await initReadonlyFluenceConfig();

  const get =
    fluenceConfig?.services?.[nameOrPathOrUrl]?.get ?? nameOrPathOrUrl;

  const serviceDirPath = isUrl(get)
    ? await downloadService(get)
    : path.resolve(get);

  const readonlyServiceConfig = (
    await initReadonlyServiceConfig(serviceDirPath)
  )?.modules;

  if (readonlyServiceConfig === undefined) {
    stopSpinner(color.red("error"));
    return commandObj.error(
      `Service ${color.yellow(nameOrPathOrUrl)} doesn't have ${color.yellow(
        SERVICE_CONFIG_FILE_NAME
      )}. Check name or path or url of the service is typed correctly`
    );
  }

  const { [FACADE_MODULE_NAME]: facade, ...otherModules } =
    readonlyServiceConfig;

  return {
    serviceDirPath,
    serviceModules: [...Object.values(otherModules), facade],
  };
};

/* eslint-disable camelcase */
type TomlModuleConfig = {
  name: string;
  load_from?: string;
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  wasi?: {
    preopened_files?: Array<string>;
    mapped_dirs?: Record<string, string>;
    envs?: Record<string, string>;
  };
  mounted_binaries?: Record<string, string>;
};

type EnsureModuleConfigsArg = {
  serviceModules: Array<ServiceModule>;
  marineCli: MarineCLI;
  serviceDirPath: string;
};

const ensureModuleConfigs = ({
  serviceModules,
  marineCli,
  serviceDirPath,
}: EnsureModuleConfigsArg): Promise<Array<TomlModuleConfig>> =>
  Promise.all(
    serviceModules.map(
      ({ get, ...overrides }): Promise<TomlModuleConfig> =>
        (async (): Promise<TomlModuleConfig> => {
          const overriddenModuleConfig = await buildModule({
            get,
            marineCli,
            serviceDirPath,
            overrides,
          });

          const {
            name,
            envs,
            loggerEnabled,
            volumes,
            preopenedFiles,
            mountedBinaries,
            maxHeapSize,
            loggingMask,
          } = overriddenModuleConfig;

          const load_from = getModuleWasmPath(overriddenModuleConfig);

          const tomlModuleConfig: TomlModuleConfig = {
            name,
            load_from,
          };

          if (loggerEnabled === true) {
            tomlModuleConfig.logger_enabled = true;
          }

          if (typeof loggingMask === "number") {
            tomlModuleConfig.logging_mask = loggingMask;
          }

          if (typeof maxHeapSize === "string") {
            tomlModuleConfig.max_heap_size = maxHeapSize;
          }

          if (volumes !== undefined) {
            tomlModuleConfig.wasi = {
              mapped_dirs: volumes,
              preopened_files: [...new Set(Object.values(volumes))],
            };
          }

          if (preopenedFiles !== undefined) {
            tomlModuleConfig.wasi = {
              preopened_files: [
                ...new Set([
                  ...Object.values(volumes ?? {}),
                  ...preopenedFiles,
                ]),
              ],
            };
          }

          if (envs !== undefined) {
            tomlModuleConfig.wasi = { envs };
          }

          if (mountedBinaries !== undefined) {
            tomlModuleConfig.mounted_binaries = mountedBinaries;
          }

          return tomlModuleConfig;
        })()
    )
  );
/* eslint-enable camelcase */
