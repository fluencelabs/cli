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

import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { NOX_NAMES_FLAG, CHAIN_FLAGS, JSON_FLAG } from "../../lib/const.js";
import { jsonStringify } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveComputePeersByNames } from "../../lib/resolveComputePeersByNames.js";

export default class Info extends BaseCommand<typeof Info> {
  static override aliases = ["provider:i"];
  static override description = "Print nox signing wallets and peer ids";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...NOX_NAMES_FLAG,
    ...JSON_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Info));
    const computePeers = await resolveComputePeersByNames(flags);

    const infoToPrint = {
      info: computePeers.map(({ name, peerId, walletAddress }) => {
        return {
          nox: name,
          peerId,
          wallet: walletAddress,
        };
      }),
    };

    if (flags.json) {
      commandObj.log(jsonStringify(infoToPrint));
      return;
    }

    commandObj.log(yamlDiffPatch("", {}, infoToPrint));
  }
}
