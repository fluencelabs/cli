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
import { commandObj } from "../../lib/commandObj.js";
import { initNewReadonlyDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import {
  DEFAULT_OFFER_NAME,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  LOCAL_NET_DEFAULT_WALLET_KEY,
  NOXES_FLAG,
  PRIV_KEY_FLAG,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { setTryTimeout, stringifyUnknown } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { addPeer } from "../provider/add-peer.js";
import { register } from "../provider/register.js";

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
    ...PRIV_KEY_FLAG,
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Up));

    const dockerComposeConfig = await initNewReadonlyDockerComposeConfig({
      noxes: flags.noxes,
    });

    try {
      await dockerCompose({
        args: ["restart"],
        printOutput: true,
        options: {
          cwd: dockerComposeConfig.$getDirPath(),
        },
      });
    } catch {
      await dockerCompose({
        args: ["up", "-d"],
        flags: {
          "quiet-pull": true,
        },
        printOutput: true,
        options: {
          cwd: dockerComposeConfig.$getDirPath(),
        },
      });
    }

    const env = "local";
    const privKey = flags["priv-key"] ?? LOCAL_NET_DEFAULT_WALLET_KEY;

    await setTryTimeout(
      async () => {
        await register({
          ...flags,
          "priv-key": privKey,
          env,
          offer: DEFAULT_OFFER_NAME,
        });
      },
      (error) => {
        commandObj.error(
          `Wasn't able to register local network on local peers in ${
            flags.timeout
          } seconds: ${stringifyUnknown(error)}`,
        );
      },
      flags.timeout * 1000,
      10000,
    );

    await addPeer({
      ...flags,
      env,
      "priv-key": privKey,
    });
  }
}
