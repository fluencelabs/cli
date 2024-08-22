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
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  CLI_NAME,
  WORKERS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { getDeal } from "../../lib/deal.js";
import { sign, getDealClient } from "../../lib/dealClient.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class WorkersRemove extends BaseCommand<typeof WorkersRemove> {
  static override aliases = ["deal:wr"];
  static override description = "Remove unit from the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    "deal-id": Flags.string({
      description: `Deal id. You can get it using '${CLI_NAME} deal info' command`,
    }),
    name: Flags.string({
      description: `Name of the deployment from ${WORKERS_CONFIG_FULL_FILE_NAME}`,
    }),
  };

  static override args = {
    "WORKER-IDS": Args.string({
      description: `Comma-separated compute unit ids. You can get them using '${CLI_NAME} deal info' command`,
    }),
  };

  async run(): Promise<void> {
    const { flags, args } = await initCli(
      this,
      await this.parse(WorkersRemove),
    );

    const { dealClient } = await getDealClient();
    const { dealId } = await getDeal({ flags });
    const dealContract = dealClient.getDeal(dealId);

    const workerIds = commaSepStrToArr(
      args["WORKER-IDS"] ??
        (await input({
          message: "Enter comma-separated worker ids",
          validate: (v: string) => {
            return commaSepStrToArr(v).length > 0;
          },
        })),
    );

    for (const workerId of workerIds) {
      await sign({
        title: `Remove worker ${workerId} from deal`,
        method: dealContract.removeWorker,
        args: [workerId],
      });

      commandObj.log(
        `Worker ${color.yellow(workerId)} was removed from the deal`,
      );
    }
  }
}
