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
import { initReadonlyFluenceConfig } from "./configs/project/fluence.js";
import {
  type ChainENV,
  CLI_NAME,
  ENV_FLAG_NAME,
  chainEnvToDealTsClientEnv,
} from "./const.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

let env: ChainENV | undefined = undefined;

function setEnv(e: ChainENV): ChainENV {
  if (env !== e) {
    commandObj.logToStderr(`Using ${color.yellow(env)} blockchain environment`);
  }

  env = e;
  return env;
}

export async function ensureChainEnv(): Promise<ChainENV> {
  if (env !== undefined) {
    return env;
  }

  const fluenceEnv = await ensureFluenceEnv();

  if (fluenceEnv !== "custom") {
    return setEnv(fluenceEnv);
  }

  const fluenceConfig = await initReadonlyFluenceConfig();

  if (fluenceConfig === null) {
    commandObj.error(
      `Fluence project is required to use custom env. Please make sure you're in the project directory or specify the environment using --${ENV_FLAG_NAME} flag`,
    );
  }

  const customContractsEnv = fluenceConfig.customFluenceEnv?.contractsEnv;

  if (customContractsEnv === undefined) {
    commandObj.error(
      `${color.yellow("customFluenceEnv")} is not defined in ${color.yellow(
        fluenceConfig.$getPath(),
      )}. Please make sure it's there or choose some other fluence environment using ${color.yellow(
        `${CLI_NAME} default env`,
      )}`,
    );
  }

  return setEnv(customContractsEnv);
}

export async function ensureDealTsClientEnv() {
  return chainEnvToDealTsClientEnv(await ensureChainEnv());
}
