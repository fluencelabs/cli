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

import { rm } from "node:fs/promises";
import { join } from "node:path";

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { createCommitments } from "../../lib/chain/commitment.js";
import { depositCollateralByNoxNames } from "../../lib/chain/depositCollateral.js";
import { distributeToNox } from "../../lib/chain/distributeToNox.js";
import { createOffers } from "../../lib/chain/offer.js";
import { registerProvider } from "../../lib/chain/providerInfo.js";
import { setEnvConfig } from "../../lib/configs/globalConfigs.js";
import {
  initNewReadonlyDockerComposeConfig,
  dockerComposeDirPath,
} from "../../lib/configs/project/dockerCompose.js";
import { initNewEnvConfig } from "../../lib/configs/project/env.js";
import { initNewReadonlyProviderConfig } from "../../lib/configs/project/provider.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import { DOCKER_COMPOSE_FLAGS } from "../../lib/const.js";
import {
  ALL_FLAG_VALUE,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  NOXES_FLAG,
  NOX_NAMES_FLAG_NAME,
  PRIV_KEY_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
} from "../../lib/const.js";
import { ensureAquaFileWithWorkerInfo } from "../../lib/deployWorkers.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureFluenceEnv } from "../../lib/resolveFluenceEnv.js";

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
    "quiet-pull": Flags.boolean({
      description: "Pull without printing progress information",
      default: true,
    }),
    detach: Flags.boolean({
      char: "d",
      description: "Detached mode: Run containers in the background",
      default: true,
    }),
    build: Flags.boolean({
      description: "Build images before starting containers",
      default: true,
    }),
    ...DOCKER_COMPOSE_FLAGS,
    reset: Flags.boolean({
      description:
        "Resets docker-compose.yaml to default, removes volumes and previous local deployments",
      allowNo: true,
      default: false,
      char: "r",
    }),
  };

  async run(): Promise<void> {
    const env: FluenceEnv = "local";
    const envConfig = await initNewEnvConfig(env);
    envConfig.fluenceEnv = env;
    await envConfig.$commit();
    setEnvConfig(envConfig);

    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Up),
    );

    const providerConfig = await initNewReadonlyProviderConfig({});

    if (flags.reset) {
      const dirPath = dockerComposeDirPath();

      try {
        await dockerCompose({
          args: ["down"],
          flags: {
            v: true,
          },
          printOutput: true,
          options: {
            cwd: dirPath,
          },
        });
      } catch {}

      try {
        await rm(join(dirPath, DOCKER_COMPOSE_FULL_FILE_NAME));
      } catch {}

      const workersConfig = await initNewWorkersConfig();

      if (workersConfig.deals !== undefined) {
        delete workersConfig.deals.local;
        await workersConfig.$commit();

        if (maybeFluenceConfig !== null) {
          const fluenceEnv = await ensureFluenceEnv();

          await ensureAquaFileWithWorkerInfo(
            workersConfig,
            maybeFluenceConfig,
            fluenceEnv,
          );
        }
      }
    }

    const dockerComposeConfig = await initNewReadonlyDockerComposeConfig();

    await dockerCompose({
      args: [
        "up",
        ...(flags.flags === undefined ? [] : flags.flags.split(" ")),
      ],
      flags: {
        "quiet-pull": flags["quiet-pull"],
        d: flags.detach,
        build: flags.build,
      },
      printOutput: true,
      options: {
        cwd: dockerComposeConfig.$getDirPath(),
      },
    });

    const allNoxNames = {
      [NOX_NAMES_FLAG_NAME]: ALL_FLAG_VALUE,
    };

    await distributeToNox({ ...flags, ...allNoxNames, amount: "10" });
    await registerProvider();

    await createOffers({
      force: true,
      offer: Object.keys(providerConfig.offers)[0],
    });

    await createCommitments({ ...flags, ...allNoxNames, env });
    await depositCollateralByNoxNames(allNoxNames);
  }
}
