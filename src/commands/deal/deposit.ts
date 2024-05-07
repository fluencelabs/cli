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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { depositToDeal } from "../../lib/chain/depositToDeal.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEPLOYMENT_NAMES_ARG,
  PT_SYMBOL,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Deposit extends BaseCommand<typeof Deposit> {
  static override description = "Deposit do the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    AMOUNT: Args.string({
      description: `Amount of ${PT_SYMBOL} tokens to deposit`,
    }),
    ...DEPLOYMENT_NAMES_ARG,
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Deposit));

    const amount =
      flagsAndArgs.args["AMOUNT"] ??
      (await input({
        message: `Enter amount of ${PT_SYMBOL} tokens to deposit`,
      }));

    await depositToDeal(flagsAndArgs, amount);
  }
}
