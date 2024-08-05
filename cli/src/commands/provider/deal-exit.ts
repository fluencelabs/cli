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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { getProviderDeals } from "../../lib/chain/deals.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEAL_IDS_FLAG_NAME,
} from "../../lib/const.js";
import {
  getDealClient,
  getSignerAddress,
  populateTx,
  signBatch,
} from "../../lib/dealClient.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class DealExit extends BaseCommand<typeof DealExit> {
  static override aliases = ["provider:de"];
  static override description = "Exit from deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
    all: Flags.boolean({
      default: false,
      description:
        "To use all deal ids that indexer is aware of for your provider address",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(DealExit));
    const { dealClient } = await getDealClient();
    const signerAddress = await getSignerAddress();
    const market = dealClient.getMarket();

    const dealIds = flags.all
      ? (await getProviderDeals()).map(({ id }) => {
          return id;
        })
      : commaSepStrToArr(
          flags[DEAL_IDS_FLAG_NAME] ??
            (await input({
              message: "Enter comma-separated deal ids",
            })),
        );

    const computeUnits = (
      await Promise.all(
        dealIds.map(async (id) => {
          const deal = dealClient.getDeal(id);
          return deal.getComputeUnits();
        }),
      )
    ).flat();

    await signBatch(
      `Remove the following compute units from deals:\n\n${computeUnits
        .map(({ id }) => {
          return id;
        })
        .join("\n")}`,
      computeUnits
        .filter((computeUnit) => {
          return computeUnit.provider.toLowerCase() === signerAddress;
        })
        .map((computeUnit) => {
          return populateTx(market.returnComputeUnitFromDeal, computeUnit.id);
        }),
    );
  }
}
