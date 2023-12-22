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

import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import {
  ENV_FLAG_NAME,
  FLUENCE_ENVS,
  isFluenceEnv,
  type FluenceEnv,
} from "./const.js";
import { list } from "./prompt.js";

export async function resolveFluenceEnv(
  fluenceEnvFromFlagsNotValidated: string | undefined,
): Promise<FluenceEnv> {
  const fluenceEnvFromFlags = await ensureValidFluenceEnvFlag(
    fluenceEnvFromFlagsNotValidated,
  );

  const fluenceEnv = fluenceEnvFromFlags ?? envConfig?.fluenceEnv;

  if (fluenceEnv !== undefined) {
    return fluenceEnv;
  }

  const fluenceEnvFromPrompt = await fluenceEnvPrompt();

  if (envConfig === null) {
    return fluenceEnvFromPrompt;
  }

  envConfig.fluenceEnv = fluenceEnvFromPrompt;
  await envConfig.$commit();
  return fluenceEnvFromPrompt;
}

export async function fluenceEnvPrompt(
  message = "Select Fluence Environment to use by default with this project",
  defaultVal: FluenceEnv = "kras",
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
  });
}

export async function ensureValidFluenceEnvFlag(
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
