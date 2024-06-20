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

import { rm } from "node:fs/promises";
import { join } from "node:path";

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { LOCAL_NET_DEFAULT_WALLET_KEY } from "../../common.js";
import { createCommitments } from "../../lib/chain/commitment.js";
import { depositCollateral } from "../../lib/chain/depositCollateral.js";
import { distributeToNox } from "../../lib/chain/distributeToNox.js";
import { createOffers } from "../../lib/chain/offer/offer.js";
import { registerProvider } from "../../lib/chain/providerInfo.js";
import { setChainFlags } from "../../lib/chainFlags.js";
import { setEnvConfig } from "../../lib/configs/globalConfigs.js";
import {
  initNewReadonlyDockerComposeConfig,
  dockerComposeDirPath,
} from "../../lib/configs/project/dockerCompose.js";
import { initNewEnvConfig } from "../../lib/configs/project/env.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  DOCKER_COMPOSE_FLAGS,
  OFFER_FLAG_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import {
  ALL_FLAG_VALUE,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  NOXES_FLAG,
  PRIV_KEY_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
  PRIV_KEY_FLAG_NAME,
} from "../../lib/const.js";
import { ensureAquaFileWithWorkerInfo } from "../../lib/deployWorkers.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Up extends BaseCommand<typeof Up> {
  static override description = `Run ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose and set up provider using all the offers from the 'offers' section in ${PROVIDER_CONFIG_FULL_FILE_NAME} config using default wallet key ${LOCAL_NET_DEFAULT_WALLET_KEY}`;
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
      default: true,
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

    setChainFlags({
      env: "local",
      [PRIV_KEY_FLAG_NAME]: LOCAL_NET_DEFAULT_WALLET_KEY,
    });

    if (flags.reset) {
      const dirPath = dockerComposeDirPath();
      await initNewReadonlyDockerComposeConfig();

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

      try {
        await rm(join(dirPath, PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME));
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

    const allOffers = { [OFFER_FLAG_NAME]: ALL_FLAG_VALUE };
    await distributeToNox({ ...flags, ...allOffers, amount: "10" });
    await registerProvider();
    await createOffers({ force: true, ...allOffers });
    await createCommitments({ ...flags, ...allOffers, env });
    await depositCollateral(allOffers);
  }
}
