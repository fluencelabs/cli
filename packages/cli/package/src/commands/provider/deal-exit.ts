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

import { BaseCommand } from "../../baseCommand.js";
import { getProviderDeals } from "../../lib/chain/deals.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEAL_IDS_FLAG_NAME,
} from "../../lib/const.js";
import {
  getContracts,
  getSignerAddress,
  populateTx,
  signBatch,
} from "../../lib/dealClient.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class DealExit extends BaseCommand<typeof DealExit> {
  static override hiddenAliases = ["provider:de"];
  static override description = `Exit from deal${aliasesText.apply(this)}`;
  static override flags = {
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
    const { contracts } = await getContracts();
    const signerAddress = await getSignerAddress();

    const dealIds = flags.all
      ? await getProviderDeals()
      : commaSepStrToArr(
          flags[DEAL_IDS_FLAG_NAME] ??
            (await input({
              message: "Enter comma-separated deal ids",
              validate(input: string) {
                return (
                  commaSepStrToArr(input).length > 0 ||
                  "Please enter at least one deal id"
                );
              },
            })),
        );

    if (dealIds.length === 0) {
      return commandObj.error("No deal ids provided");
    }

    const workers = (
      await Promise.all(
        dealIds.map(async (id) => {
          const deal = contracts.getDeal(id);
          return (await deal.getWorkers()).map((worker) => {
            return { deal, worker };
          });
        }),
      )
    )
      .flat()
      .filter(({ worker }) => {
        return worker.provider.toLowerCase() === signerAddress;
      });

    const [firstWorker, ...restWorkers] = workers;

    if (firstWorker === undefined) {
      return commandObj.error(
        `No workers found for address ${signerAddress} and deal ids: ${dealIds.join(", ")}`,
      );
    }

    await signBatch(
      `Remove the following workers from deals:\n\n${workers
        .map(({ worker: { onchainId } }) => {
          return onchainId;
        })
        .join("\n")}`,
      [
        populateTx(firstWorker.deal.removeWorker, firstWorker.worker.onchainId),
        ...restWorkers.map(({ deal, worker: { onchainId } }) => {
          return populateTx(deal.removeWorker, onchainId);
        }),
      ],
    );
  }
}
