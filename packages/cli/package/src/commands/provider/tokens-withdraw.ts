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

import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { withdrawFromPeer } from "../../lib/chain/distributeToNox.js";
import {
  CHAIN_FLAGS,
  FLT_SYMBOL,
  MAX_TOKEN_AMOUNT_KEYWORD,
  PEER_AND_OFFER_NAMES_FLAGS,
} from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

const AMOUNT_FLAG_NAME = "amount";

export default class TokensWithdraw extends BaseCommand<typeof TokensWithdraw> {
  static override hiddenAliases = ["provider:tw"];
  static override description = `Withdraw ${FLT_SYMBOL} tokens from peers${aliasesText.apply(this)}`;
  static override flags = {
    ...CHAIN_FLAGS,
    ...PEER_AND_OFFER_NAMES_FLAGS,
    [AMOUNT_FLAG_NAME]: Flags.string({
      description: `Amount of ${FLT_SYMBOL} tokens to withdraw from peers. Use --${AMOUNT_FLAG_NAME} ${MAX_TOKEN_AMOUNT_KEYWORD} to withdraw maximum possible amount`,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(TokensWithdraw));
    await withdrawFromPeer(flags);
  }
}
