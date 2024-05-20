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
import { collateralWithdraw } from "../../lib/chain/commitment.js";
import {
  CC_IDS_FLAG_NAME,
  CHAIN_FLAGS,
  FLT_SYMBOL,
  MAX_CUS_FLAG,
  MAX_CUS_FLAG_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CollateralWithdraw extends BaseCommand<
  typeof CollateralWithdraw
> {
  static override aliases = ["delegator:cw"];
  static override description = `Withdraw ${FLT_SYMBOL} collateral from capacity commitment`;
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...MAX_CUS_FLAG,
  };
  static override args = {
    IDS: Args.string({
      description: "Comma separated capacity commitment IDs",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await initCli(
      this,
      await this.parse(CollateralWithdraw),
    );

    await collateralWithdraw({
      [CC_IDS_FLAG_NAME]: args.IDS,
      [MAX_CUS_FLAG_NAME]: flags[MAX_CUS_FLAG_NAME],
    });
  }
}
