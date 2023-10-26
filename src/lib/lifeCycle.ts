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

import { color } from "@oclif/color";
import type {
  ArgOutput,
  FlagOutput,
  ParserOutput,
} from "@oclif/core/lib/interfaces/parser.js";

import {
  commandObj,
  isInteractive,
  setCommandObjAndIsInteractive,
  type CommandObj,
} from "./commandObj.js";
import {
  setEnvConfig,
  setUserConfig,
  userConfig,
} from "./configs/globalConfigs.js";
import { initEnvConfig, initNewEnvConfig } from "./configs/project/env.js";
import {
  type FluenceConfig,
  initFluenceConfig,
} from "./configs/project/fluence.js";
import {
  CHECK_FOR_UPDATES_DISABLED,
  initNewUserConfig,
  initUserConfig,
} from "./configs/user/config.js";
import {
  NODE_JS_MAJOR_VERSION,
  CHECK_FOR_UPDATES_INTERVAL,
  SEPARATOR,
  CLI_NAME_FULL,
  type NO_INPUT_FLAG_NAME,
  CLI_NAME,
  PACKAGE_NAME,
} from "./const.js";
import { haltCountly, initCountly, logErrorToCountly } from "./countly.js";
import "./setupEnvironment.js";
import { dbg } from "./dbg.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import { getIsInteractive } from "./helpers/getIsInteractive.js";
import { stringifyUnknown } from "./helpers/utils.js";
import { updateRelaysJSON } from "./multiaddres.js";
import { getLatestVersionOfNPMDependency } from "./npm.js";
import {
  projectRootDir,
  recursivelyFindProjectRootDir,
  setProjectRootDir,
} from "./paths.js";
import { confirm } from "./prompt.js";

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
  };
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
      `${CLI_NAME_FULL} requires Node.js version "${NODE_JS_MAJOR_VERSION}.x.x"; Detected ${platform.version}.\nYou can use https://nvm.sh utility to set Node.js version: "nvm install ${NODE_JS_MAJOR_VERSION} && nvm use ${NODE_JS_MAJOR_VERSION} && nvm alias default ${NODE_JS_MAJOR_VERSION}"`,
    );
  }

  await ensureUserConfig();

  const res = requiresFluenceProject
    ? { fluenceConfig: await ensureFluenceProject() }
    : { maybeFluenceConfig: await initFluenceConfig() };

  const maybeFluenceConfig = res.fluenceConfig ?? res.maybeFluenceConfig;
  await initCountly({ maybeFluenceConfig });
  await ensureCorrectCliVersion(maybeFluenceConfig?.cliVersion);

  if (requiresFluenceProject) {
    setEnvConfig(await initNewEnvConfig());
  } else {
    const envConfig = await initEnvConfig();

    if (envConfig !== null) {
      setEnvConfig(envConfig);
    }
  }

  await updateRelaysJSON({
    fluenceConfig: maybeFluenceConfig,
  });

  return {
    args,
    flags,
    ...res,
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

const ensureCorrectCliVersion = async (
  maybeCliVersion: string | undefined,
): Promise<void> => {
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
        `npm i -g ${PACKAGE_NAME}@${cliVersion}`,
      )}\n\nAfter that, run:\n\n${color.yellow(
        `${CLI_NAME} dep v`,
      )}\n\nto find out which version of rust-peer you need to use to make sure you are running ${CLI_NAME_FULL} against the compatible version of rust-peer\n\n`,
    );
  }

  if (!isInteractive || !(await isCheckForUpdatesRequired())) {
    return;
  }

  try {
    const [stableVersion, unstableVersion] = await Promise.all([
      getLatestVersionOfNPMDependency(`${PACKAGE_NAME}`),
      getLatestVersionOfNPMDependency(`${PACKAGE_NAME}@unstable`),
    ]);

    const semver = await import("semver");
    const isOlderThanStable = semver.lt(currentVersion, stableVersion);
    const isStable = semver.eq(currentVersion, stableVersion);
    const isOlderThenUnstable = semver.lt(currentVersion, unstableVersion);
    const hasUpdates = isOlderThanStable || isOlderThenUnstable;

    if (isStable || !hasUpdates) {
      return;
    }

    const version = isOlderThanStable ? stableVersion : unstableVersion;

    commandObj.logToStderr(
      `${SEPARATOR}New ${color.yellow(
        isOlderThanStable ? "stable" : "unstable",
      )} version ${color.yellow(
        version,
      )} of ${CLI_NAME_FULL} is available\n\nYou can install it with:\n\n${color.yellow(
        `npm i -g ${PACKAGE_NAME}@${version}`,
      )}${SEPARATOR}`,
    );

    const isCheckingForUpdates = await confirm({
      message: "Do you want me to continue checking for updates once per day?",
    });

    if (!isCheckingForUpdates) {
      userConfig.lastCheckForUpdates = CHECK_FOR_UPDATES_DISABLED;
      await userConfig.$commit();

      commandObj.logToStderr(
        `\nUpdates checking is now disabled. You can enable it again by removing 'lastCheckForUpdates' property from ${userConfig.$getPath()}\n`,
      );
    }
  } catch (e) {
    await logErrorToCountly(`npm version check failed: ${stringifyUnknown(e)}`);
  }
};

export const exitCli = async (): Promise<never> => {
  await haltCountly();
  // Countly doesn't let process to finish
  // So there is a need to do it explicitly
  // eslint-disable-next-line no-process-exit
  process.exit(0);
};
