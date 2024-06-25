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

import type { ChainENV } from "../common.js";

import { commandObj } from "./commandObj.js";
import { initReadonlyFluenceConfig } from "./configs/project/fluence.js";
import { CLI_NAME, ENV_FLAG_NAME } from "./const.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

let env: ChainENV | undefined = undefined;

function setEnv(e: ChainENV): ChainENV {
  if (env !== e) {
    commandObj.logToStderr(`Using ${color.yellow(e)} blockchain environment`);
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
