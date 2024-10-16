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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { jsonStringify, LOCAL_NET_DEFAULT_ACCOUNTS } from "../../common.js";
import {
  getBlockScoutUrl,
  getChainId,
  getRpcUrl,
  getSubgraphUrl,
} from "../../lib/chain/chainConfig.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { resolveDeployment } from "../../lib/dealClient.js";
import { ensureChainEnv } from "../../lib/ensureChainNetwork.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Info extends BaseCommand<typeof Info> {
  static override description =
    "Show contract addresses for the fluence environment and accounts for the local environment";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Info));
    const chainEnv = await ensureChainEnv();

    commandObj.log(
      jsonStringify({
        ...(chainEnv === "local"
          ? { defaultAccountsForLocalEnv: LOCAL_NET_DEFAULT_ACCOUNTS }
          : {}),
        contracts: await resolveDeployment(),
        subgraphUrl: await getSubgraphUrl(),
        chainId: await getChainId(),
        chainRPC: await getRpcUrl(),
        ...(await getBlockScoutUrl()),
      }),
    );
  }
}
