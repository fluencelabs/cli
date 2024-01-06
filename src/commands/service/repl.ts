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

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";

import { color } from "@oclif/color";
import { Args, Command } from "@oclif/core";

import { resolveSingleServiceModuleConfigsAndBuild } from "../../lib/build.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import {
  initReadonlyFluenceConfig,
  type FluenceConfig,
} from "../../lib/configs/project/fluence.js";
import type { ModuleConfigReadonly } from "../../lib/configs/project/module.js";
import {
  initReadonlyServiceConfig,
  type ServiceConfigReadonly,
} from "../../lib/configs/project/service.js";
import {
  BIN_DIR_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FS_OPTIONS,
  MARINE_BUILD_ARGS_FLAG,
  MREPL_CARGO_DEPENDENCY,
  NO_INPUT_FLAG,
  SEPARATOR,
} from "../../lib/const.js";
import { haltCountly } from "../../lib/countly.js";
import { getModuleWasmPath } from "../../lib/helpers/downloadFile.js";
import { updateAquaServiceInterfaceFile } from "../../lib/helpers/generateServiceInterface.js";
import { startSpinner, stopSpinner } from "../../lib/helpers/spinner.js";
import { exitCli, initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import {
  ensureFluenceTmpConfigTomlPath,
  projectRootDir,
} from "../../lib/paths.js";
import { input, list } from "../../lib/prompt.js";
import { ensureCargoDependency } from "../../lib/rust.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

/**
 * This command doesn't extend BaseCommand like other commands do because it
 * spawns a separate repl process which should keep cli alive
 * This means we have to manually call exitCli() in all other cases before
 * the final return statement
 */
export default class REPL extends Command {
  static override description =
    "Open service inside repl (downloads and builds modules if necessary)";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    ...MARINE_BUILD_ARGS_FLAG,
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Service name from ${FLUENCE_CONFIG_FULL_FILE_NAME}, path to a service or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(REPL),
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await promptForNamePathOrUrl(maybeFluenceConfig));

    const serviceConfig = await ensureServiceConfig(nameOrPathOrUrl);
    const marineCli = await initMarineCli(maybeFluenceConfig);

    startSpinner("Making sure service and modules are downloaded and built");

    const { moduleConfigs, facadeModuleConfig } =
      await resolveSingleServiceModuleConfigsAndBuild(
        serviceConfig,
        maybeFluenceConfig,
        marineCli,
        flags["marine-build-args"],
      );

    const isServiceListedInFluenceConfig =
      maybeFluenceConfig?.services?.[nameOrPathOrUrl] !== undefined;

    if (isServiceListedInFluenceConfig) {
      await updateAquaServiceInterfaceFile(
        { [nameOrPathOrUrl]: getModuleWasmPath(facadeModuleConfig) },
        maybeFluenceConfig.services,
        marineCli,
      );
    }

    stopSpinner();

    const fluenceTmpConfigTomlPath = await ensureFluenceTmpConfigTomlPath();
    const stringifyToTOML = (await import("@iarna/toml/stringify.js")).default;

    await writeFile(
      fluenceTmpConfigTomlPath,
      stringifyToTOML({
        total_memory_limit:
          typeof serviceConfig.totalMemoryLimit === "string"
            ? serviceConfig.totalMemoryLimit
            : "Infinity",
        module: ensureModuleConfigsForToml(moduleConfigs),
      }),
      FS_OPTIONS,
    );

    if (!isInteractive) {
      await exitCli();
      return;
    }

    const mreplDirPath = await ensureCargoDependency({
      nameAndVersion: MREPL_CARGO_DEPENDENCY,
      maybeFluenceConfig,
    });

    const mreplPath = join(mreplDirPath, BIN_DIR_NAME, "mrepl");

    commandObj.logToStderr(`${SEPARATOR}Execute ${color.yellow(
      "help",
    )} inside repl to see available commands.
Current service <module_name> is: ${color.yellow(facadeModuleConfig.name)}
Call ${facadeModuleConfig.name} service functions in repl like this:

${color.yellow(
  `call ${facadeModuleConfig.name} <function_name> [<arg1>, <arg2>]`,
)}${SEPARATOR}}`);

    await haltCountly();

    spawn(mreplPath, [fluenceTmpConfigTomlPath], {
      stdio: "inherit",
      detached: true,
    });
  }
}

const ensureServiceConfig = async (
  nameOrPathOrUrl: string,
): Promise<ServiceConfigReadonly> => {
  const fluenceConfig = await initReadonlyFluenceConfig();

  const serviceOrServiceDirPathOrUrl =
    fluenceConfig?.services?.[nameOrPathOrUrl]?.get ?? nameOrPathOrUrl;

  const readonlyServiceConfig = await initReadonlyServiceConfig(
    serviceOrServiceDirPathOrUrl,
    typeof fluenceConfig?.services?.[nameOrPathOrUrl]?.get === "string"
      ? projectRootDir
      : cwd(),
  );

  if (readonlyServiceConfig === null) {
    stopSpinner(color.red("error"));
    return commandObj.error(
      `No service config found at ${color.yellow(
        serviceOrServiceDirPathOrUrl,
      )}`,
    );
  }

  return readonlyServiceConfig;
};

type TomlModuleConfig = {
  name: string;
  load_from?: string;
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  wasi?: {
    mapped_dirs?: Record<string, string>;
    envs?: Record<string, string>;
  };
  mounted_binaries?: Record<string, string>;
};

const ensureModuleConfigsForToml = (
  moduleConfigs: Array<ModuleConfigReadonly>,
) => {
  return moduleConfigs.map((moduleConfig) => {
    const {
      name,
      envs,
      loggerEnabled,
      volumes,
      mountedBinaries,
      maxHeapSize,
      loggingMask,
    } = moduleConfig;

    const load_from = getModuleWasmPath(moduleConfig);

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
      };
    }

    if (envs !== undefined) {
      tomlModuleConfig.wasi = { envs };
    }

    if (mountedBinaries !== undefined) {
      tomlModuleConfig.mounted_binaries = mountedBinaries;
    }

    return tomlModuleConfig;
  });
};

const ENTER_PATH_OR_URL_MSG =
  "Enter path to a service or url to .tar.gz archive";

async function promptForNamePathOrUrl(
  maybeFluenceConfig: FluenceConfig | null,
): Promise<string> {
  const serviceNames = Object.keys(maybeFluenceConfig?.services ?? {});

  const selected = await list({
    message: "Select service",
    options:
      serviceNames.length === 0 ? [] : [...serviceNames, ENTER_PATH_OR_URL_MSG],
    oneChoiceMessage(s) {
      return `Do you want to select ${color.yellow(s)} service`;
    },
    onNoChoices() {
      return ENTER_PATH_OR_URL_MSG;
    },
  });

  if (selected === ENTER_PATH_OR_URL_MSG) {
    return input({
      message: ENTER_PATH_OR_URL_MSG,
    });
  }

  return selected;
}
