/**
 * Copyright 2024 Fluence DAO
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
import { withdrawFromNox } from "../../lib/chain/distributeToNox.js";
import {
  CHAIN_FLAGS,
  FLT_SYMBOL,
  MAX_TOKEN_AMOUNT_KEYWORD,
  NOX_NAMES_FLAG,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

const AMOUNT_FLAG_NAME = "amount";

export default class TokensWithdraw extends BaseCommand<typeof TokensWithdraw> {
  static override aliases = ["provider:tw"];
  static override description = `Withdraw ${FLT_SYMBOL} tokens from noxes`;
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...NOX_NAMES_FLAG,
    [AMOUNT_FLAG_NAME]: Flags.string({
      description: `Amount of ${FLT_SYMBOL} tokens to withdraw from noxes. Use --${AMOUNT_FLAG_NAME} ${MAX_TOKEN_AMOUNT_KEYWORD} to withdraw maximum possible amount`,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(TokensWithdraw));
    await withdrawFromNox(flags);
  }
}
