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

import color from "@oclif/color";

import { FluenceConfig, initFluenceConfig } from "./configs/project/fluence";
import {
  initNewUserConfig,
  initUserConfig,
  UserConfig,
} from "./configs/user/config";
import type { CommandObj, NO_INPUT_FLAG_NAME } from "./const";
import { haltCountly, initCountly } from "./countly";
import "./setupEnvironment";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject";
import { getIsInteractive } from "./helpers/getIsInteractive";
import { confirm } from "./prompt";

type EnsureUserConfigArg = {
  commandObj: CommandObj;
  isInteractive: boolean;
};

const ensureUserConfig = async ({
  commandObj,
  isInteractive,
}: EnsureUserConfigArg): Promise<UserConfig> => {
  const userConfig = await initUserConfig(commandObj);

  if (userConfig !== null) {
    return userConfig;
  }

  const newUserConfig = await initNewUserConfig(commandObj);

  if (
    isInteractive &&
    (await confirm({
      isInteractive,
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

type CommonReturn<A extends Args, F extends Flags> = {
  userConfig: UserConfig;
  commandObj: CommandObj;
  maybeFluenceConfig: FluenceConfig | null;
  isInteractive: boolean;
  args: A;
  flags: F;
};

type Args = Record<string, unknown>;
type Flags = Record<string, unknown> & { [NO_INPUT_FLAG_NAME]: boolean };

export async function initCli<A extends Args, F extends Flags>(
  commandObj: CommandObj,
  { args, flags }: { args: A; flags: F },
  requiresFluenceProject?: false
): Promise<CommonReturn<A, F> & { maybeFluenceConfig: FluenceConfig | null }>;
export async function initCli<A extends Args, F extends Flags>(
  commandObj: CommandObj,
  { args, flags }: { args: A; flags: F },
  requiresFluenceProject: true
): Promise<CommonReturn<A, F> & { fluenceConfig: FluenceConfig }>;

export async function initCli<A extends Args, F extends Flags>(
  commandObj: CommandObj,
  { args, flags }: { args: A; flags: F },
  requiresFluenceProject = false
): Promise<
  CommonReturn<A, F> & {
    fluenceConfig?: FluenceConfig | null;
    maybeFluenceConfig?: FluenceConfig | null;
  }
> {
  const isInteractive = getIsInteractive(flags);
  const userConfig = await ensureUserConfig({ commandObj, isInteractive });
  const maybeFluenceConfig = await initFluenceConfig(commandObj);
  await initCountly({ commandObj, userConfig, maybeFluenceConfig });

  return {
    maybeFluenceConfig,
    userConfig,
    commandObj,
    isInteractive,
    args,
    flags,
    ...(requiresFluenceProject
      ? {
          fluenceConfig:
            maybeFluenceConfig === null
              ? await ensureFluenceProject(commandObj, isInteractive)
              : maybeFluenceConfig,
        }
      : { maybeFluenceConfig }),
  };
}

export const exitCli = async (): Promise<never> => {
  await haltCountly();

  // Countly doesn't let process to finish
  // So there is a need to do it explicitly
  // eslint-disable-next-line no-process-exit, unicorn/no-process-exit
  process.exit(0);
};
