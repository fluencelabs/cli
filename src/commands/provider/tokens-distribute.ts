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
import { distributeToNox } from "../../lib/chain/distributeToNox.js";
import { CHAIN_FLAGS, FLT_SYMBOL, NOX_NAMES_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class TokensDistribute extends BaseCommand<
  typeof TokensDistribute
> {
  static override aliases = ["provider:td"];
  static override description = `Distribute ${FLT_SYMBOL} tokens to noxes`;
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...NOX_NAMES_FLAG,
    amount: Flags.string({
      description: `Amount of ${FLT_SYMBOL} tokens to distribute to noxes`,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(TokensDistribute));
    await distributeToNox(flags);
  }
}
