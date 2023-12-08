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

import { commandObj } from "../commandObj.js";
import {
  type Network,
  NETWORK_NAME,
  isContractsEnv,
  ENV_FLAG_NAME,
} from "../const.js";
import { list } from "../prompt.js";

export async function ensureValidContractsEnv(envFlag: string | undefined) {
  return (await ensureValidContractsEnvFlag(envFlag)) ?? contractsEnvPrompt();
}

async function contractsEnvPrompt(): Promise<Network> {
  return list({
    message: `Select environment to use`,
    options: [...NETWORK_NAME],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
    default: "kras" as const,
  });
}

async function ensureValidContractsEnvFlag(
  envFlag: string | undefined,
): Promise<Network | undefined> {
  if (envFlag === undefined) {
    return undefined;
  }

  if (!isContractsEnv(envFlag)) {
    commandObj.warn(
      `Invalid flag: ${color.yellow(`--${ENV_FLAG_NAME} ${envFlag}`)}`,
    );

    return contractsEnvPrompt();
  }

  return envFlag;
}
