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
import { distributeToPeer } from "../../lib/chain/distributeToNox.js";
import {
  CHAIN_FLAGS,
  FLT_SYMBOL,
  PEER_AND_OFFER_NAMES_FLAGS,
} from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class TokensDistribute extends BaseCommand<
  typeof TokensDistribute
> {
  static override hiddenAliases = ["provider:td"];
  static override description = `Distribute ${FLT_SYMBOL} tokens to peers${aliasesText.apply(this)}`;
  static override flags = {
    ...CHAIN_FLAGS,
    ...PEER_AND_OFFER_NAMES_FLAGS,
    amount: Flags.string({
      description: `Amount of ${FLT_SYMBOL} tokens to distribute to peers`,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(TokensDistribute));
    await distributeToPeer(flags);
  }
}
