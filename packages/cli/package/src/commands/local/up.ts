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

import { rm } from "node:fs/promises";
import { join } from "node:path";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
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
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  DOCKER_COMPOSE_FLAGS,
  OFFER_FLAG_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
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
import { stringifyUnknown } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Up extends BaseCommand<typeof Up> {
  static override description = `Run ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose and set up provider using all the offers from the 'offers' section in ${PROVIDER_CONFIG_FULL_FILE_NAME} config using default wallet key ${LOCAL_NET_DEFAULT_WALLET_KEY}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
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
    "no-reset": Flags.boolean({
      description:
        "Don't reset docker-compose.yaml to default, don't remove volumes and previous local deployments",
      default: false,
      char: "r",
    }),
    "no-wait": Flags.boolean({
      description: "Don't wait for services to be running|healthy",
      default: false,
    }),
    "no-set-up": Flags.boolean({
      description:
        "Don't set up provider, offer, commitments and deposit collateral, so there will be no active offer on the network after command is finished",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const env: FluenceEnv = "local";

    try {
      const envConfig = await initNewEnvConfig(env);
      envConfig.fluenceEnv = env;
      await envConfig.$commit();
      setEnvConfig(envConfig);
    } catch (e) {
      this.error(
        `Make sure to init fluence project first. Error: ${stringifyUnknown(e)}`,
      );
    }

    const { flags } = await initCli(this, await this.parse(Up));

    setChainFlags({
      env: "local",
      [PRIV_KEY_FLAG_NAME]: LOCAL_NET_DEFAULT_WALLET_KEY,
    });

    if (!flags["no-reset"]) {
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

        if ((await initFluenceConfig()) !== null) {
          await ensureAquaFileWithWorkerInfo();
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
        wait: !flags["no-wait"],
      },
      printOutput: true,
      options: {
        cwd: dockerComposeConfig.$getDirPath(),
      },
    });

    if (flags["no-set-up"]) {
      return;
    }

    const allOffers = { [OFFER_FLAG_NAME]: ALL_FLAG_VALUE };
    await distributeToNox({ ...flags, ...allOffers, amount: "10" });
    await registerProvider();
    await createOffers({ force: true, ...allOffers });
    await createCommitments({ ...flags, ...allOffers, env });
    await depositCollateral(allOffers);
  }
}
