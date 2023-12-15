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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { PRIV_KEY_FLAG, ENV_FLAG } from "../../lib/const.js";
import { dealUpdate } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { ensureChainNetwork } from "../../lib/provider.js";

export default class ChangeApp extends BaseCommand<typeof ChangeApp> {
  static override hidden = true;
  static override description = "Change app id in the deal";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
    "NEW-APP-CID": Args.string({
      description: "New app CID for the deal",
    }),
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(ChangeApp),
    );

    const tx = await dealUpdate({
      dealAddress:
        args["DEAL-ADDRESS"] ??
        (await input({ message: "Enter deal address" })),
      appCID:
        args["NEW-APP-CID"] ?? (await input({ message: "Enter new app CID" })),
      contractsENV: await ensureChainNetwork(flags.env, maybeFluenceConfig),
      privKey: flags["priv-key"],
    });

    commandObj.logToStderr(`Tx hash: ${color.yellow(tx.hash)}`);
  }
}
