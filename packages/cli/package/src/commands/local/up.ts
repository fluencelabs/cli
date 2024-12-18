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
import { dirname } from "node:path";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { LOCAL_NET_DEFAULT_WALLET_KEY } from "../../common.js";
import { createCommitments } from "../../lib/chain/commitment.js";
import { depositCollateral } from "../../lib/chain/depositCollateral.js";
import { distributeToNox } from "../../lib/chain/distributeToNox.js";
import { createOffers } from "../../lib/chain/offer/offer.js";
import { registerProvider } from "../../lib/chain/providerInfo.js";
import { setChainFlags } from "../../lib/chainFlags.js";
import { ensureDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import { initNewEnvConfig } from "../../lib/configs/project/env/env.js";
import {
  DOCKER_COMPOSE_FLAGS,
  OFFER_FLAG_NAME,
  ALL_FLAG_VALUE,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  SERVERS_FLAG,
  PRIV_KEY_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
  PRIV_KEY_FLAG_NAME,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  ensureDockerComposeConfigPath,
  ensureProviderArtifactsConfigPath,
} from "../../lib/paths.js";

export default class Up extends BaseCommand<typeof Up> {
  static override description = `Run ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose and set up provider using all the offers from the 'offers' section in ${PROVIDER_CONFIG_FULL_FILE_NAME} config using default wallet key ${LOCAL_NET_DEFAULT_WALLET_KEY}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...SERVERS_FLAG,
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
    const envConfig = await initNewEnvConfig(env);
    envConfig.fluenceEnv = env;
    await envConfig.$commit();
    const { flags } = await initCli(this, await this.parse(Up));

    setChainFlags({
      env: "local",
      [PRIV_KEY_FLAG_NAME]: LOCAL_NET_DEFAULT_WALLET_KEY,
    });

    const dockerComposeConfigPath = await ensureDockerComposeConfigPath();
    const dockerComposeDir = dirname(dockerComposeConfigPath);

    if (!flags["no-reset"]) {
      try {
        await dockerCompose({
          args: ["down"],
          flags: { v: true },
          printOutput: true,
          options: { cwd: dockerComposeDir },
        });
      } catch {}

      try {
        await rm(dockerComposeConfigPath);
      } catch {}

      try {
        await rm(await ensureProviderArtifactsConfigPath());
      } catch {}
    }

    await ensureDockerComposeConfig();

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
      options: { cwd: dockerComposeDir },
    });

    if (flags["no-set-up"]) {
      return;
    }

    const allOffers = { [OFFER_FLAG_NAME]: ALL_FLAG_VALUE };
    await distributeToNox({ ...flags, ...allOffers, amount: "10" });
    await registerProvider();
    await createOffers({ force: true, ...allOffers });
    await createCommitments({ ...flags, ...allOffers });
    await depositCollateral(allOffers);
  }
}
