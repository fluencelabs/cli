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

import { color } from "@oclif/color";

import { CHAIN_ENV, DEFAULT_PUBLIC_FLUENCE_ENV } from "../common.js";

import { chainFlags } from "./chainFlags.js";
import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import {
  ENV_FLAG_NAME,
  FLUENCE_ENVS_OLD,
  isFluenceEnv,
  type FluenceEnv,
  type FluenceEnvOld,
} from "./const.js";
import { list } from "./prompt.js";

let env: FluenceEnv | undefined = undefined;
// this is needed so you never see env prompt multiple times
let envPromptPromise: Promise<FluenceEnv> | undefined = undefined;

export async function ensureFluenceEnv(): Promise<FluenceEnv> {
  if (env !== undefined) {
    return env;
  }

  const fluenceEnvFromFlags = await ensureValidFluenceEnvFlag(chainFlags.env);
  const fluenceEnv = fluenceEnvFromFlags ?? envConfig?.fluenceEnv;

  if (fluenceEnv !== undefined) {
    env = fluenceEnv;
    return fluenceEnv;
  }

  if (envPromptPromise !== undefined) {
    return envPromptPromise;
  }

  envPromptPromise = fluenceEnvPrompt();
  env = await envPromptPromise;

  if (envConfig !== null) {
    envConfig.fluenceEnv = env;
    await envConfig.$commit();
  }

  return env;
}

export async function fluenceEnvPrompt(
  message = "Select Fluence Environment to use",
  defaultVal: FluenceEnv = DEFAULT_PUBLIC_FLUENCE_ENV,
): Promise<FluenceEnv> {
  return list({
    message,
    options: [...CHAIN_ENV],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
    default: defaultVal,
    flagName: ENV_FLAG_NAME,
  });
}

export async function fluenceEnvOldPrompt(
  message = "Select old Fluence Environment that you used",
  defaultVal: FluenceEnvOld = "kras",
): Promise<FluenceEnvOld> {
  return list({
    message,
    options: [...FLUENCE_ENVS_OLD],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
    default: defaultVal,
    flagName: ENV_FLAG_NAME,
  });
}

async function ensureValidFluenceEnvFlag(
  envFlagArg: string | undefined,
): Promise<FluenceEnv | undefined> {
  if (envFlagArg === undefined) {
    return undefined;
  }

  let envFlag = envFlagArg;

  if (envFlag === "kras") {
    commandObj.warn(`'kras' is deprecated, use 'mainnet' instead`);
    envFlag = "mainnet";
  } else if (envFlag === "dar") {
    commandObj.warn(`'dar' is deprecated, use 'testnet' instead`);
    envFlag = "testnet";
  }

  if (!isFluenceEnv(envFlag)) {
    commandObj.warn(
      `Invalid flag: ${color.yellow(`--${ENV_FLAG_NAME} ${envFlag}`)}`,
    );

    return fluenceEnvPrompt();
  }

  return envFlag;
}

export async function ensureValidFluenceEnv(envFlag: string | undefined) {
  return (await ensureValidFluenceEnvFlag(envFlag)) ?? fluenceEnvPrompt();
}
