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

import type { Contracts } from "@fluencelabs/deal-ts-clients";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEAL_IDS_FLAG_NAME,
} from "../../lib/const.js";
import {
  getContracts,
  getSignerAddress,
  multicallRead,
  populateTx,
  signBatch,
  type MulticallReadItem,
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
    // TODO: When we have a way to get all deal ids for a provider address
    // all: Flags.boolean({
    //   default: false,
    //   description:
    //     "To use all deal ids that indexer is aware of for your provider address",
    // }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(DealExit));
    const { contracts } = await getContracts();
    const signerAddress = await getSignerAddress();

    const dealIds =
      // flags.all
      //   ? await getProviderDeals()
      //   :
      commaSepStrToArr(
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

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const workersFromRPC = (await multicallRead(
      dealIds.map((id): MulticallReadItem => {
        const deal = contracts.getDeal(id);
        return {
          target: id,
          callData: deal.interface.encodeFunctionData("getWorkers"),
          decode(returnData) {
            return deal.interface.decodeFunctionResult(
              "getWorkers",
              returnData,
            );
          },
        };
      }),
    )) as Awaited<ReturnType<ReturnType<Contracts["getDeal"]>["getWorkers"]>>[];

    const dealWorkers = dealIds.map((id, i) => {
      const deal = contracts.getDeal(id);
      const workers = workersFromRPC[i];

      return {
        dealId: id,
        workers: (workers ?? [])
          .filter((worker) => {
            return worker.provider.toLowerCase() === signerAddress;
          })
          .map((worker) => {
            return { worker, deal };
          }),
      };
    });

    for (const { dealId, workers } of dealWorkers) {
      const [firstWorker, ...restWorkers] = workers;

      if (firstWorker === undefined) {
        commandObj.warn(
          `No workers found for address ${signerAddress} and deal id: ${dealId}`,
        );

        continue;
      }

      await signBatch(
        `Remove the following workers from deal ${dealId}:\n\n${workers
          .map(({ worker: { onchainId } }) => {
            return onchainId;
          })
          .join("\n")}`,
        [
          populateTx(
            firstWorker.deal.removeWorker,
            firstWorker.worker.onchainId,
          ),
          ...restWorkers.map(({ deal, worker: { onchainId } }) => {
            return populateTx(deal.removeWorker, onchainId);
          }),
        ],
      );
    }
  }
}
