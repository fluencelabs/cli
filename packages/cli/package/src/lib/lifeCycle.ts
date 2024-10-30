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

import { access } from "fs/promises";

import { color } from "@oclif/color";

import { setChainFlags } from "./chainFlags.js";
import {
  commandObj,
  setCommandObjAndIsInteractive,
  type CommandObj,
} from "./commandObj.js";
import { initNewEnvConfig } from "./configs/project/env/env.js";
import { initFluenceConfig } from "./configs/project/fluence.js";
import { initNewUserConfig } from "./configs/user/config/config.js";
import {
  NODE_JS_MAJOR_VERSION,
  CLI_NAME_FULL,
  NO_INPUT_FLAG_NAME,
  CLI_NAME,
  PRIV_KEY_FLAG_NAME,
  ENV_FLAG_NAME,
} from "./const.js";
import { haltCountly, initCountly } from "./countly.js";
import "./setupEnvironment.js";
import { dbg } from "./dbg.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import { getIsInteractive } from "./helpers/getIsInteractive.js";
import { numToStr } from "./helpers/typesafeStringify.js";
import {
  projectRootDir,
  recursivelyFindProjectRootDir,
  setProjectRootDir,
  getProviderConfigPath,
} from "./paths.js";

const NODE_JS_MAJOR_VERSION_STR = numToStr(NODE_JS_MAJOR_VERSION);

export async function initCli<
  T extends {
    args: unknown;
    flags: {
      [NO_INPUT_FLAG_NAME]: boolean;
      [ENV_FLAG_NAME]?: string | undefined;
      [PRIV_KEY_FLAG_NAME]?: string | undefined;
    };
  },
>(
  commandObjFromArgs: CommandObj,
  argsAndFlags: T,
  requiresFluenceProject = false,
): Promise<T> {
  dbg("command execution started");
  setProjectRootDir(await recursivelyFindProjectRootDir(projectRootDir));

  setCommandObjAndIsInteractive(
    commandObjFromArgs,
    getIsInteractive(argsAndFlags.flags),
  );

  const platform = (await import("platform")).default;

  if (platform.version === undefined) {
    return commandObj.error("Unknown platform");
  }

  const majorVersion = Number(platform.version.split(".")[0]);

  if (majorVersion !== NODE_JS_MAJOR_VERSION) {
    return commandObj.error(
      `${CLI_NAME_FULL} requires Node.js version "${NODE_JS_MAJOR_VERSION_STR}.x.x"; Detected ${platform.version}.\nYou can use https://nvm.sh utility to set Node.js version: "nvm install ${NODE_JS_MAJOR_VERSION_STR} && nvm use ${NODE_JS_MAJOR_VERSION_STR} && nvm alias default ${NODE_JS_MAJOR_VERSION_STR}"`,
    );
  }

  await initNewUserConfig();

  if (requiresFluenceProject) {
    await initNewEnvConfig();
  } else {
    try {
      // ensure env config also when provider.yaml exists
      await access(getProviderConfigPath());
      await initNewEnvConfig();
    } catch {}
  }

  setChainFlags({
    env: argsAndFlags.flags.env,
    [PRIV_KEY_FLAG_NAME]: argsAndFlags.flags[PRIV_KEY_FLAG_NAME],
  });

  const res = requiresFluenceProject
    ? { fluenceConfig: await ensureFluenceProject() }
    : { maybeFluenceConfig: await initFluenceConfig() };

  const maybeFluenceConfig = res.fluenceConfig ?? res.maybeFluenceConfig;
  await initCountly({ maybeFluenceConfig });
  ensureCorrectCliVersion(maybeFluenceConfig?.cliVersion);
  return argsAndFlags;
}

function ensureCorrectCliVersion(maybeCliVersion: string | undefined): void {
  const currentVersion = commandObj.config.version;

  if (
    typeof maybeCliVersion === "string" &&
    maybeCliVersion !== currentVersion
  ) {
    const cliVersion = maybeCliVersion;
    return commandObj.error(
      `Current ${CLI_NAME_FULL} versions is ${color.yellow(
        currentVersion,
      )}, but this project is compatible only with ${CLI_NAME_FULL} version ${color.yellow(
        cliVersion,
      )}\n\nPlease install it with:\n\n${color.yellow(
        `${CLI_NAME} update --version ${cliVersion}`,
      )}`,
    );
  }
}

export const exitCli = async (): Promise<never> => {
  await haltCountly();
  // Countly doesn't let process to finish
  // So there is a need to do it explicitly
  process.exit(0);
};
