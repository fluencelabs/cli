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
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initNewWorkersConfigReadonly } from "../../lib/configs/project/workers.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
} from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Stop extends BaseCommand<typeof Stop> {
  static override description = "Stop the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    deal: Flags.string({
      description: `Comma-separated deal names of the deployed deals for the current environment. Default: all deployed deals`,
      helpValue: "<name>",
      exclusive: ["deal-id"],
    }),
    "deal-id": Flags.string({
      description: `Comma-separated deal ids of the deployed deal`,
      helpValue: "<name>",
      exclusive: ["deal"],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Stop));
    const dealIds = await getDealIds(flags);
    const { dealClient } = await getDealClient();

    for (const dealId of dealIds) {
      const deal = dealClient.getDeal(dealId);
      await sign(deal.stop);
      color.green(`Stopped deal ${dealId}`);
    }
  }
}

async function getDealIds({
  deal,
  "deal-id": dealId,
}: {
  deal?: string | undefined;
  "deal-id"?: string | undefined;
}) {
  if (dealId !== undefined) {
    return commaSepStrToArr(dealId);
  }

  const workersConfig = await initNewWorkersConfigReadonly();
  const fluenceEnv = await ensureFluenceEnv();

  if (deal !== undefined) {
    const names = commaSepStrToArr(deal);

    const [invalidNames, dealIds] = splitErrorsAndResults(names, (name) => {
      const { dealIdOriginal } =
        workersConfig.deals?.[fluenceEnv]?.[name] ?? {};

      if (dealIdOriginal === undefined) {
        return { error: name };
      }

      return { result: dealIdOriginal };
    });

    if (invalidNames.length > 0) {
      commandObj.error(
        `Couldn't find deals in ${workersConfig.$getPath()} at deals.${fluenceEnv} for names: ${invalidNames.join(
          ", ",
        )}`,
      );
    }

    return dealIds;
  }

  const dealIds = Object.values(workersConfig.deals?.[fluenceEnv] ?? {}).map(
    ({ dealIdOriginal }) => {
      return dealIdOriginal;
    },
  );

  if (dealIds.length === 0) {
    commandObj.error(
      `No deals found in ${workersConfig.$getPath()} at deals.${fluenceEnv}`,
    );
  }

  return dealIds;
}
