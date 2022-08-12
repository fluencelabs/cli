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

import stringifyToTOML from "@iarna/toml/stringify";
import color from "@oclif/color";
import { CliUx, Command } from "@oclif/core";

import { initReadonlyFluenceConfig } from "../../lib/configs/project/fluence";
import {
  initReadonlyModuleConfig,
  MODULE_TYPE_RUST,
} from "../../lib/configs/project/module";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  ModuleV0 as ServiceModule,
} from "../../lib/configs/project/service";
import {
  CommandObj,
  FLUENCE_CONFIG_FILE_NAME,
  FS_OPTIONS,
  MODULE_CONFIG_FILE_NAME,
  MREPL_CARGO_DEPENDENCY,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import {
  downloadModule,
  downloadService,
  getModuleUrlOrAbsolutePath,
  getModuleWasmPath,
  isUrl,
} from "../../lib/helpers/downloadFile";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { initMarineCli, MarineCLI } from "../../lib/marineCli";
import { ensureFluenceTmpConfigTomlPath } from "../../lib/paths";
import { input } from "../../lib/prompt";
import { ensureCargoDependency } from "../../lib/rust";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class REPL extends Command {
  static override description =
    "Open service inside repl (downloads and builds modules if necessary)";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: NAME_OR_PATH_OR_URL,
      description: `Service name from ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}, path to a service or url to .tar.gz archive`,
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(REPL);
    const isInteractive = getIsInteractive(flags);
    const nameOrPathOrUrlFromArgs: unknown = args[NAME_OR_PATH_OR_URL];

    assert(
      typeof nameOrPathOrUrlFromArgs === "string" ||
        typeof nameOrPathOrUrlFromArgs === "undefined"
    );

    const nameOrPathOrUrl =
      nameOrPathOrUrlFromArgs ??
      (await input({
        isInteractive,
        message: `Enter service name from ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}, path to a service or url to .tar.gz archive`,
      }));

    CliUx.ux.action.start(
      "Making sure service and modules are downloaded and built"
    );

    const serviceModules = await ensureServiceConfig({
      commandObj: this,
      nameOrPathOrUrl,
    });

    const marineCli = await initMarineCli(this);

    const moduleConfigs = await ensureModuleConfigs({
      serviceModules,
      commandObj: this,
      marineCli,
    });

    CliUx.ux.action.stop();

    const fluenceTmpConfigTomlPath = await ensureFluenceTmpConfigTomlPath();

    await fsPromises.writeFile(
      fluenceTmpConfigTomlPath,
      stringifyToTOML({ module: moduleConfigs }),
      FS_OPTIONS
    );

    if (!isInteractive) {
      return;
    }

    spawn(
      await ensureCargoDependency({
        name: MREPL_CARGO_DEPENDENCY,
        commandObj: this,
      }),
      [fluenceTmpConfigTomlPath],
      { stdio: "inherit", detached: true }
    );
  }
}

type EnsureServiceConfigArg = {
  nameOrPathOrUrl: string;
  commandObj: CommandObj;
};

const ensureServiceConfig = async ({
  commandObj,
  nameOrPathOrUrl,
}: EnsureServiceConfigArg): Promise<Array<ServiceModule>> => {
  const fluenceConfig = await initReadonlyFluenceConfig(commandObj);

  const get =
    fluenceConfig?.services?.[nameOrPathOrUrl]?.get ?? nameOrPathOrUrl;

  const serviceDirPath = isUrl(get)
    ? await downloadService(get)
    : path.resolve(get);

  const modules = (await initReadonlyServiceConfig(serviceDirPath, commandObj))
    ?.modules;

  if (modules === undefined) {
    CliUx.ux.action.stop(color.red("error"));
    return commandObj.error(
      `Service ${color.yellow(nameOrPathOrUrl)} doesn't have ${color.yellow(
        SERVICE_CONFIG_FILE_NAME
      )}`
    );
  }

  const { [FACADE_MODULE_NAME]: facade, ...otherModules } = modules;

  return [...Object.values(otherModules), facade].map(
    (moduleConfig): ServiceModule => ({
      ...moduleConfig,
      get: getModuleUrlOrAbsolutePath(moduleConfig.get, serviceDirPath),
    })
  );
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
  commandObj: CommandObj;
  marineCli: MarineCLI;
};

const ensureModuleConfigs = ({
  commandObj,
  serviceModules,
  marineCli,
}: EnsureModuleConfigsArg): Promise<Array<TomlModuleConfig>> =>
  Promise.all(
    serviceModules.map(
      ({ get, ...overrides }): Promise<TomlModuleConfig> =>
        (async (): Promise<TomlModuleConfig> => {
          const modulePath = isUrl(get) ? await downloadModule(get) : get;

          const moduleConfig =
            (await initReadonlyModuleConfig(modulePath, commandObj)) ??
            CliUx.ux.action.stop(color.red("error")) ??
            commandObj.error(
              `Module with get: ${color.yellow(
                get
              )} doesn't have ${color.yellow(MODULE_CONFIG_FILE_NAME)}`
            );

          const overriddenModules = { ...moduleConfig, ...overrides };

          const {
            name,
            envs,
            loggerEnabled,
            volumes,
            type,
            preopenedFiles,
            mountedBinaries,
            maxHeapSize,
            loggingMask,
          } = overriddenModules;

          if (type === MODULE_TYPE_RUST) {
            await marineCli({
              command: "build",
              flags: { release: true },
              workingDir: path.dirname(moduleConfig.$getPath()),
            });
          }

          const load_from = getModuleWasmPath(overriddenModules);

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
