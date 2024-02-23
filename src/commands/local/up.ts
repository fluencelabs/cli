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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { createCommitments } from "../../lib/chain/createCommitment.js";
import { depositCollateralByNoxNames } from "../../lib/chain/depositCollateral.js";
import { distributeToNox } from "../../lib/chain/distributeToNox.js";
import { createOffers } from "../../lib/chain/offer.js";
import { registerProvider } from "../../lib/chain/providerInfo.js";
import { commandObj } from "../../lib/commandObj.js";
import { setEnvConfig } from "../../lib/configs/globalConfigs.js";
import { initNewReadonlyDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import { initNewEnvConfig } from "../../lib/configs/project/env.js";
import {
  initNewReadonlyProviderConfig,
  initReadonlyProviderConfig,
} from "../../lib/configs/project/provider.js";
import {
  ALL_FLAG_VALUE,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  NOXES_FLAG,
  NOX_NAMES_FLAG_NAME,
  PRIV_KEY_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm } from "../../lib/prompt.js";

export default class Up extends BaseCommand<typeof Up> {
  static override description = `Run ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose and set up provider using the first offer from the 'offers' section in ${PROVIDER_CONFIG_FULL_FILE_NAME} file.`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...NOXES_FLAG,
    timeout: Flags.integer({
      description:
        "Timeout in seconds for attempting to register local network on local peers",
      default: 120,
    }),
    ...PRIV_KEY_FLAG,
  };

  async run(): Promise<void> {
    const env: FluenceEnv = "local";
    const envConfig = await initNewEnvConfig(env);
    envConfig.fluenceEnv = env;
    await envConfig.$commit();
    setEnvConfig(envConfig);

    const { flags } = await initCli(this, await this.parse(Up));

    let providerConfig = await initReadonlyProviderConfig();

    if (
      providerConfig === null &&
      !(await confirm({
        message: `${PROVIDER_CONFIG_FULL_FILE_NAME} not found. But it is required for local environment. Do you want to create a new one?`,
      }))
    ) {
      commandObj.logToStderr("Aborting.");
      return;
    }

    providerConfig = await initNewReadonlyProviderConfig(flags);
    const dockerComposeConfig = await initNewReadonlyDockerComposeConfig();

    try {
      const res = await dockerCompose({
        args: ["down"],
        flags: {
          v: true,
        },
        printOutput: true,
        options: {
          cwd: dockerComposeConfig.$getDirPath(),
        },
      });

      if (res.trim() === "") {
        throw new Error("docker-compose down failed");
      }
    } catch {
      await dockerCompose({
        args: ["up"],
        flags: {
          "quiet-pull": true,
          d: true,
          build: true,
        },
        printOutput: true,
        options: {
          cwd: dockerComposeConfig.$getDirPath(),
        },
      });
    }

    const allNoxNames = {
      [NOX_NAMES_FLAG_NAME]: ALL_FLAG_VALUE,
    };

    await distributeToNox({ ...flags, ...allNoxNames, amount: "100" });
    await registerProvider();

    await createOffers({
      force: true,
      offer: Object.keys(providerConfig.offers)[0],
    });

    await createCommitments({ ...flags, ...allNoxNames, env });
    await depositCollateralByNoxNames(allNoxNames);
  }
}
