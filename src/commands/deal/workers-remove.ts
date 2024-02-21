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

import { color } from "@oclif/color";
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS, CLI_NAME } from "../../lib/const.js";
import { sign, getDealClient } from "../../lib/dealClient.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class RemoveUnit extends BaseCommand<typeof RemoveUnit> {
  static override description = "Remove unit from the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  static override args = {
    "UNIT-IDS": Args.string({
      description: `Comma-separated compute unit ids. You can get them using '${CLI_NAME} deal info' command`,
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(RemoveUnit));

    const unitIds = commaSepStrToArr(
      args["UNIT-IDS"] ??
        (await input({
          message: "Enter comma-separated compute unit ids",
          validate: (v: string) => {
            return commaSepStrToArr(v).length > 0;
          },
        })),
    );

    const { dealClient } = await getDealClient();
    const market = await dealClient.getMarket();

    for (const unitId of unitIds) {
      await sign(market.returnComputeUnitFromDeal, unitId);
      commandObj.log(`Unit ${color.yellow(unitId)} was removed from the deal`);
    }
  }
}
