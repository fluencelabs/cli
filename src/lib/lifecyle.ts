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

import {
  commandObj,
  CommandObj,
  isInteractive,
  setCommandObjAndIsInteractive,
} from "./commandObj.js";
import { FluenceConfig, initFluenceConfig } from "./configs/project/fluence.js";
import {
  initNewUserConfig,
  initUserConfig,
  UserConfig,
} from "./configs/user/config.js";
import type { NO_INPUT_FLAG_NAME } from "./const.js";
import { haltCountly, initCountly } from "./countly.js";
import "./setupEnvironment.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import { getIsInteractive } from "./helpers/getIsInteractive.js";
import {
  projectRootDir,
  recursivelyFindProjectRootDir,
  setProjectRootDir,
} from "./paths.js";
import { confirm } from "./prompt.js";

const ensureUserConfig = async (): Promise<UserConfig> => {
  const userConfig = await initUserConfig();

  if (userConfig !== null) {
    return userConfig;
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

  return newUserConfig;
};

type CommonReturn<A extends ArgOutput, F extends FlagOutput> = {
  userConfig: UserConfig;
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

  if (majorVersion < 16 || majorVersion >= 17) {
    return commandObj.error(
      `Fluence CLI requires Node.js version "16.x.x"; Detected ${platform.version}. Please use Node.js version 16.\nYou can use https://nvm.sh utility to set Node.js version: "nvm install 16 && nvm use 16 && nvm alias default 16"`
    );
  }

  const userConfig = await ensureUserConfig();
  const maybeFluenceConfig = await initFluenceConfig();
  await initCountly({ userConfig, maybeFluenceConfig });

  return {
    userConfig,
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

export const exitCli = async (): Promise<never> => {
  await haltCountly();

  // Countly doesn't let process to finish
  // So there is a need to do it explicitly
  // eslint-disable-next-line no-process-exit
  process.exit(0);
};
