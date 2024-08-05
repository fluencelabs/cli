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
  static override aliases = ["deal:wr"];
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
    const market = dealClient.getMarket();

    for (const unitId of unitIds) {
      await sign(
        `Remove compute unit ${unitId} from deal`,
        market.returnComputeUnitFromDeal,
        unitId,
      );

      commandObj.log(`Unit ${color.yellow(unitId)} was removed from the deal`);
    }
  }
}
