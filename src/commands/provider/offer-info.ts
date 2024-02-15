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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import {
  resolveOffersFromProviderArtifactsConfig,
  getOffersInfo,
  offersInfoToString,
} from "../../lib/chain/offer.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  OFFERS_FLAG_NAME,
  OFFERS_FLAG_OBJECT,
  ENV_FLAG,
  PRIV_KEY_FLAG,
} from "../../lib/const.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class OfferInfo extends BaseCommand<typeof OfferInfo> {
  static override description = "Get info about offers";
  static override flags = {
    ...baseFlags,
    [OFFERS_FLAG_NAME]: Flags.string({
      ...OFFERS_FLAG_OBJECT,
      exclusive: ["ids"],
    }),
    ids: Flags.string({
      description: "Comma-separated list of offer ids",
      exclusive: [OFFERS_FLAG_NAME],
    }),
    ...ENV_FLAG,
    ...PRIV_KEY_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(OfferInfo));

    const offers =
      flags.ids === undefined
        ? Object.fromEntries(
            (await resolveOffersFromProviderArtifactsConfig(flags)).map(
              ({ id, offerName }) => {
                return [offerName, id] as const;
              },
            ),
          )
        : Object.fromEntries(
            commaSepStrToArr(flags.ids).map((id, i) => {
              return [`offer-${i}`, id] as const;
            }),
          );

    const offerInfoResult = await getOffersInfo(offers);
    commandObj.logToStderr(offersInfoToString(offerInfoResult));
  }
}
