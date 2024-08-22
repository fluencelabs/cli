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

import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { jsonStringify } from "../../common.js";
import { getProviderInfo } from "../../lib/chain/providerInfo.js";
import { commandObj } from "../../lib/commandObj.js";
import { NOX_NAMES_FLAG, CHAIN_FLAGS, JSON_FLAG } from "../../lib/const.js";
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
    const providerInfo = await getProviderInfo();

    const infoToPrint = {
      providerInfo: {
        ...(providerInfo.name === null
          ? { status: "NotRegistered" }
          : { status: "Registered", name: providerInfo.name }),
        address: providerInfo.address,
      },
      computePeers: computePeers.map(({ name, peerId, walletAddress }) => {
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
