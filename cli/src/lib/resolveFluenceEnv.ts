/**
 * Copyright 2024 Fluence DAO
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
import { DEFAULT_PUBLIC_FLUENCE_ENV } from "@repo/common";

import { chainFlags } from "./chainFlags.js";
import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import {
  ENV_FLAG_NAME,
  FLUENCE_ENVS,
  isFluenceEnv,
  type FluenceEnv,
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
    options: [...FLUENCE_ENVS],
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
  envFlag: string | undefined,
): Promise<FluenceEnv | undefined> {
  if (envFlag === undefined) {
    return undefined;
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
