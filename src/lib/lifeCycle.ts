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

import { access } from "fs/promises";

import { color } from "@oclif/color";
import type {
  ArgOutput,
  FlagOutput,
  ParserOutput,
} from "@oclif/core/lib/interfaces/parser.js";

import { setChainFlags, type ChainFlags } from "./chainFlags.js";
import {
  commandObj,
  isInteractive,
  setCommandObjAndIsInteractive,
  type CommandObj,
} from "./commandObj.js";
import { setEnvConfig, setUserConfig } from "./configs/globalConfigs.js";
import { initEnvConfig, initNewEnvConfig } from "./configs/project/env.js";
import {
  type FluenceConfig,
  initFluenceConfig,
} from "./configs/project/fluence.js";
import { initNewUserConfig, initUserConfig } from "./configs/user/config.js";
import {
  NODE_JS_MAJOR_VERSION,
  CLI_NAME_FULL,
  NO_INPUT_FLAG_NAME,
  CLI_NAME,
  PRIV_KEY_FLAG_NAME,
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
import { confirm } from "./prompt.js";

const NODE_JS_MAJOR_VERSION_STR = numToStr(NODE_JS_MAJOR_VERSION);

const ensureUserConfig = async (): Promise<void> => {
  const maybeUserConfig = await initUserConfig();
  const isGeneratingNewUserConfig = maybeUserConfig === null;
  const userConfig = maybeUserConfig ?? (await initNewUserConfig());

  if (
    isGeneratingNewUserConfig &&
    isInteractive &&
    (await confirm({
      message: `Help me improve ${CLI_NAME_FULL} by sending anonymous usage data. I don't collect IDs, names, or other personal data.\n${color.gray(
        "Metrics will help the developers know which features are useful so they can prioritize what to work on next. Fluence Labs hosts a Countly instance to record anonymous usage data.",
      )}\nOK?`,
    }))
  ) {
    userConfig.countlyConsent = true;
    await userConfig.$commit();

    commandObj.logToStderr(
      `If you change your mind later, modify "countlyConsent" property in ${userConfig.$getPath()}`,
    );
  }

  setUserConfig(userConfig);
};

type CommonReturn<A extends ArgOutput, F extends FlagOutput> = {
  args: A;
  flags: F;
};

type ParserOutputWithNoInputFlag<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput,
> = ParserOutput<F, F2, A> & {
  flags: {
    [NO_INPUT_FLAG_NAME]: boolean;
  } & ChainFlags;
};

export async function initCli<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput,
>(
  commandObj: CommandObj,
  parserOutput: ParserOutputWithNoInputFlag<F, F2, A>,
  requiresFluenceProject?: false,
): Promise<CommonReturn<A, F> & { maybeFluenceConfig: FluenceConfig | null }>;
export async function initCli<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput,
>(
  commandObj: CommandObj,
  parserOutput: ParserOutputWithNoInputFlag<F, F2, A>,
  requiresFluenceProject: true,
): Promise<CommonReturn<A, F> & { fluenceConfig: FluenceConfig }>;

export async function initCli<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput,
>(
  commandObjFromArgs: CommandObj,
  { args, flags }: ParserOutputWithNoInputFlag<F, F2, A>,
  requiresFluenceProject = false,
): Promise<
  CommonReturn<A, F> & {
    fluenceConfig?: FluenceConfig | null;
    maybeFluenceConfig?: FluenceConfig | null;
  }
> {
  dbg("command execution started");
  setProjectRootDir(await recursivelyFindProjectRootDir(projectRootDir));
  setCommandObjAndIsInteractive(commandObjFromArgs, getIsInteractive(flags));

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

  await ensureUserConfig();

  if (requiresFluenceProject) {
    setEnvConfig(await initNewEnvConfig());
  } else {
    try {
      // ensure env config also when provider.yaml exists
      await access(getProviderConfigPath());
      setEnvConfig(await initNewEnvConfig());
    } catch {
      const envConfig = await initEnvConfig();

      if (envConfig !== null) {
        setEnvConfig(envConfig);
      }
    }
  }

  setChainFlags({
    env: flags.env,
    [PRIV_KEY_FLAG_NAME]: flags[PRIV_KEY_FLAG_NAME],
  });

  const res = requiresFluenceProject
    ? { fluenceConfig: await ensureFluenceProject() }
    : { maybeFluenceConfig: await initFluenceConfig() };

  const maybeFluenceConfig = res.fluenceConfig ?? res.maybeFluenceConfig;
  await initCountly({ maybeFluenceConfig });
  ensureCorrectCliVersion(maybeFluenceConfig?.cliVersion);
  return { args, flags, ...res };
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
