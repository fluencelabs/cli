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
import type { FluenceConfigReadonly } from "./configs/project/fluence.js";
import {
  type ContractsENV,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  CLI_NAME,
} from "./const.js";
import { resolveFluenceEnv } from "./multiaddres.js";

export async function ensureChainNetwork(
  fluenceEnvFromFlags: string | undefined,
  maybeFluenceConfig: FluenceConfigReadonly | null,
): Promise<ContractsENV> {
  const fluenceEnv = await resolveFluenceEnv(fluenceEnvFromFlags);

  if (fluenceEnv !== "custom") {
    commandObj.logToStderr(
      `Using ${color.yellow(
        fluenceEnv,
      )} blockchain environment to send transactions`,
    );

    return fluenceEnv;
  }

  const customContractsEnv = maybeFluenceConfig?.customFluenceEnv?.contractsEnv;

  if (customContractsEnv === undefined) {
    commandObj.error(
      `${color.yellow("customFluenceEnv")} is not defined in ${color.yellow(
        maybeFluenceConfig?.$getPath() ?? FLUENCE_CONFIG_FULL_FILE_NAME,
      )}. Please make sure it's there or choose some other fluence environment using ${color.yellow(
        `${CLI_NAME} default env`,
      )}`,
    );
  }

  commandObj.logToStderr(
    `Using ${color.yellow(
      customContractsEnv,
    )} blockchain environment to send transactions`,
  );

  return customContractsEnv;
}
