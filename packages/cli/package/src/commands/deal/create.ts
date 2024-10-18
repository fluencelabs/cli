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
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { dealCreate } from "../../lib/deal.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Create extends BaseCommand<typeof Create> {
  hidden = true;
  static override description =
    "Create your deal with the specified parameters";
  static override flags = {
    ...baseFlags,
    "app-cid": Flags.string({
      description: "CID of the application that will be deployed",
      required: true,
    }),
    "collateral-per-worker": Flags.string({
      description: "Collateral per worker",
      required: true,
    }),
    "min-workers": Flags.integer({
      description: "Required workers to activate the deal",
      required: true,
    }),
    "target-workers": Flags.integer({
      description: "Max workers in the deal",
      required: true,
    }),
    "max-workers-per-provider": Flags.integer({
      description: "Max workers per provider",
      required: true,
    }),
    "price-per-cu-per-epoch": Flags.string({
      description: "Price per CU per epoch",
      required: true,
    }),
    "initial-balance": Flags.string({
      description: "Initial balance",
      required: false,
    }),
    effectors: Flags.string({
      description: "Comma-separated list of effector to be used in the deal",
    }),
    whitelist: Flags.string({
      description: "Comma-separated list of whitelisted providers",
      exclusive: ["blacklist"],
    }),
    blacklist: Flags.string({
      description: "Comma-separated list of blacklisted providers",
      exclusive: ["whitelist"],
    }),
    "protocol-version": Flags.integer({
      description: "Protocol version",
    }),
    "cu-count-per-worker": Flags.integer({
      description: "Compute unit count per worker",
      required: true,
    }),
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Create));

    const dealAddress = await dealCreate({
      cuCountPerWorker: flags["cu-count-per-worker"],
      appCID: flags["app-cid"],
      minWorkers: flags["min-workers"],
      targetWorkers: flags["target-workers"],
      maxWorkersPerProvider: flags["max-workers-per-provider"],
      pricePerCuPerEpoch: flags["price-per-cu-per-epoch"],
      effectors:
        flags.effectors === undefined ? [] : commaSepStrToArr(flags.effectors),
      initialBalance: flags["initial-balance"],
      whitelist:
        flags.whitelist === undefined
          ? undefined
          : commaSepStrToArr(flags.whitelist),
      blacklist:
        flags.blacklist === undefined
          ? undefined
          : commaSepStrToArr(flags.blacklist),
      protocolVersion: flags["protocol-version"],
    });

    commandObj.logToStderr(
      `Deal contract created: ${color.yellow(dealAddress)}`,
    );
  }
}
