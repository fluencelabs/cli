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
import {
  BLOCK_SCOUT_URLS,
  jsonStringify,
  LOCAL_NET_DEFAULT_ACCOUNTS,
} from "../../common.js";
import { CHAIN_URLS } from "../../common.js";
import { getChainId } from "../../lib/chain/chainId.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { default: contracts }: { default: unknown } = await import(
      `@fluencelabs/deal-ts-clients/dist/deployments/${chainEnv === "testnet" ? "dar" : chainEnv}.json`,
      {
        assert: { type: "json" },
      }
    );

    commandObj.log(
      jsonStringify({
        ...(chainEnv === "local"
          ? { defaultAccountsForLocalEnv: LOCAL_NET_DEFAULT_ACCOUNTS }
          : {}),
        contracts,
        chainId: await getChainId(),
        chainRPC: CHAIN_URLS[chainEnv],
        ...(chainEnv === "local"
          ? {}
          : { blockScoutUrl: BLOCK_SCOUT_URLS[chainEnv] }),
      }),
    );
  }
}
