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

import { commandObj } from "./commandObj.js";
import { initNewWorkersConfigReadonly } from "./configs/project/workers.js";
import { commaSepStrToArr, splitErrorsAndResults } from "./helpers/utils.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

export async function getDealIds({
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
