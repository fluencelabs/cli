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
import { depositCollateral } from "../../lib/chain/depositCollateral.js";
import { distributeToNox } from "../../lib/chain/distributeToNox.js";
import { createOffers } from "../../lib/chain/offer.js";
import { registerProvider } from "../../lib/chain/providerInfo.js";
import { initNewReadonlyDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import {
  DEFAULT_OFFER_NAME,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  NOXES_FLAG,
  CHAIN_FLAGS,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Up extends BaseCommand<typeof Up> {
  static override description = `Run ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...NOXES_FLAG,
    timeout: Flags.integer({
      description:
        "Timeout in seconds for attempting to register local network on local peers",
      default: 120,
    }),
    ...CHAIN_FLAGS,
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Up));

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

    flags.env = "local";

    await distributeToNox({ ...flags, amount: "100" });

    await registerProvider();

    await createOffers({
      force: true,
      offers: DEFAULT_OFFER_NAME,
    });

    const ccIds = await createCommitments(flags);
    await depositCollateral(ccIds);
  }
}
