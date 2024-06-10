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
