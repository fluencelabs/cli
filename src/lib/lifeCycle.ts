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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type {
  ArgOutput,
  FlagOutput,
  ParserOutput,
} from "@oclif/core/lib/interfaces/parser.js";
import platform from "platform";
import semver from "semver";

import {
  commandObj,
  isInteractive,
  setCommandObjAndIsInteractive,
  type CommandObj,
} from "./commandObj.js";
import {
  type FluenceConfig,
  initFluenceConfig,
} from "./configs/project/fluence.js";
import {
  CHECK_FOR_UPDATES_DISABLED,
  initNewUserConfig,
  initUserConfig,
  setUserConfig,
  userConfig,
} from "./configs/user/config.js";
import {
  NODE_JS_MAJOR_VERSION,
  CHECK_FOR_UPDATES_INTERVAL,
  SEPARATOR,
  type NO_INPUT_FLAG_NAME,
} from "./const.js";
import { haltCountly, initCountly, logErrorToCountly } from "./countly.js";
import "./setupEnvironment.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import { getIsInteractive } from "./helpers/getIsInteractive.js";
import { stringifyUnknown } from "./helpers/jsonStringify.js";
import { getLatestVersionOfNPMDependency } from "./npm.js";
import {
  projectRootDir,
  recursivelyFindProjectRootDir,
  setProjectRootDir,
} from "./paths.js";
import { confirm } from "./prompt.js";

const ensureUserConfig = async (): Promise<void> => {
  const maybeUserConfig = await initUserConfig();

  if (maybeUserConfig !== null) {
    setUserConfig(maybeUserConfig);
    return;
  }

  const newUserConfig = await initNewUserConfig();

  if (
    isInteractive &&
    (await confirm({
      message: `Help me improve Fluence CLI by sending anonymous usage data. I don't collect IDs, names, or other personal data.\n${color.gray(
        "Metrics will help the developers know which features are useful so they can prioritize what to work on next. Fluence Labs hosts a Countly instance to record anonymous usage data."
      )}\nOK?`,
    }))
  ) {
    newUserConfig.countlyConsent = true;
    await newUserConfig.$commit();
  }

  setUserConfig(newUserConfig);
};

type CommonReturn<A extends ArgOutput, F extends FlagOutput> = {
  args: A;
  flags: F;
};

type ParserOutputWithNoInputFlag<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput
> = ParserOutput<F, F2, A> & {
  flags: {
    [NO_INPUT_FLAG_NAME]: boolean;
  };
};

export async function initCli<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput
>(
  commandObj: CommandObj,
  parserOutput: ParserOutputWithNoInputFlag<F, F2, A>,
  requiresFluenceProject?: false
): Promise<CommonReturn<A, F> & { maybeFluenceConfig: FluenceConfig | null }>;
export async function initCli<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput
>(
  commandObj: CommandObj,
  parserOutput: ParserOutputWithNoInputFlag<F, F2, A>,
  requiresFluenceProject: true
): Promise<CommonReturn<A, F> & { fluenceConfig: FluenceConfig }>;

export async function initCli<
  F extends FlagOutput,
  F2 extends FlagOutput,
  A extends ArgOutput
>(
  commandObjFromArgs: CommandObj,
  { args, flags }: ParserOutputWithNoInputFlag<F, F2, A>,
  requiresFluenceProject = false
): Promise<
  CommonReturn<A, F> & {
    fluenceConfig?: FluenceConfig | null;
    maybeFluenceConfig?: FluenceConfig | null;
  }
> {
  setProjectRootDir(await recursivelyFindProjectRootDir(projectRootDir));
  setCommandObjAndIsInteractive(commandObjFromArgs, getIsInteractive(flags));

  if (platform.version === undefined) {
    return commandObj.error("Unknown platform");
  }

  const majorVersion = Number(platform.version.split(".")[0]);

  if (majorVersion !== NODE_JS_MAJOR_VERSION) {
    return commandObj.error(
      `Fluence CLI requires Node.js version "${NODE_JS_MAJOR_VERSION}.x.x"; Detected ${platform.version}.\nYou can use https://nvm.sh utility to set Node.js version: "nvm install ${NODE_JS_MAJOR_VERSION} && nvm use ${NODE_JS_MAJOR_VERSION} && nvm alias default ${NODE_JS_MAJOR_VERSION}"`
    );
  }

  // just doing these operations in parallel cause they are independent
  // only `maybeFluenceConfig` config is destructured cause `ensureUserConfig`
  // function sets a global singleton that is available everywhere
  const [maybeFluenceConfig] = await Promise.all([
    initFluenceConfig(),
    ensureUserConfig(),
  ]);

  await initCountly({ maybeFluenceConfig });
  await handleFluenceCLIVersion(maybeFluenceConfig?.cliVersion);

  return {
    args,
    flags,
    ...(requiresFluenceProject
      ? {
          fluenceConfig:
            maybeFluenceConfig === null
              ? await ensureFluenceProject()
              : maybeFluenceConfig,
        }
      : { maybeFluenceConfig }),
  };
}

const isCheckForUpdatesRequired = async () => {
  const { lastCheckForUpdates } = userConfig;

  if (lastCheckForUpdates === CHECK_FOR_UPDATES_DISABLED) {
    return false;
  }

  const now = new Date();
  const lastCheckForUpdatesDate = new Date(lastCheckForUpdates ?? 0);
  const lastCheckForUpdatesMilliseconds = lastCheckForUpdatesDate.getTime();

  if (
    lastCheckForUpdates === undefined ||
    Number.isNaN(lastCheckForUpdatesMilliseconds) ||
    now.getTime() - lastCheckForUpdatesMilliseconds > CHECK_FOR_UPDATES_INTERVAL
  ) {
    userConfig.lastCheckForUpdates = now.toISOString();
    await userConfig.$commit();
    return true;
  }

  return false;
};

const handleFluenceCLIVersion = async (
  maybeFluenceCLIVersion: string | undefined
): Promise<void> => {
  if (
    typeof maybeFluenceCLIVersion === "string" &&
    maybeFluenceCLIVersion !== commandObj.config.version
  ) {
    const flunenceCLIVersion = maybeFluenceCLIVersion;
    return commandObj.error(
      `Current CLI versions is ${color.yellow(
        commandObj.config.version
      )}, but this fluence project is compatible only with Fluence CLI version ${color.yellow(
        flunenceCLIVersion
      )}\n\nPlease install it with:\n\n${color.yellow(
        `npm i -g @fluencelabs/cli@${flunenceCLIVersion}`
      )}\n\nAfter that, run:\n\n${color.yellow(
        "fluence dep v"
      )}\n\nto find out which version of rust-peer you need to use to make sure you are running Fluence CLI against the compatible version of rust-peer\n\n`
    );
  }

  if (!isInteractive || !(await isCheckForUpdatesRequired())) {
    return;
  }

  try {
    const [stableVersion, unstableVersion] = await Promise.all([
      getLatestVersionOfNPMDependency("@fluencelabs/cli"),
      getLatestVersionOfNPMDependency("@fluencelabs/cli@unstable"),
    ]);

    const isOlderThanStable = semver.lt(
      commandObj.config.version,
      stableVersion
    );

    const isOlderThenUnstable = semver.lt(
      commandObj.config.version,
      unstableVersion
    );

    if (!isOlderThanStable && !isOlderThenUnstable) {
      return;
    }

    const version = isOlderThanStable ? stableVersion : unstableVersion;

    commandObj.log(
      `${SEPARATOR}New ${color.yellow(
        isOlderThanStable ? "stable" : "unstable"
      )} version ${color.yellow(
        version
      )} of Fluence CLI is available\n\nYou can install it with:\n\n${color.yellow(
        `npm i -g @fluencelabs/cli@${version}`
      )}${SEPARATOR}`
    );

    if (
      await confirm({
        message: "Do you want to disable daily updates checking?",
        default: false,
      })
    ) {
      userConfig.lastCheckForUpdates = CHECK_FOR_UPDATES_DISABLED;
      await userConfig.$commit();

      commandObj.log(
        `\nUpdates checking is now disabled. You can enable it again by removing 'lastCheckForUpdates' property from ${userConfig.$getPath()}\n`
      );
    }
  } catch (e) {
    logErrorToCountly(`npm version check failed: ${stringifyUnknown(e)}`);
  }
};

export const exitCli = async (): Promise<never> => {
  await haltCountly();

  // Countly doesn't let process to finish
  // So there is a need to do it explicitly
  // eslint-disable-next-line no-process-exit
  process.exit(0);
};
