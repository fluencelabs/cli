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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import {
  resolveCreatedOffers,
  getOffersInfo,
  offersInfoToString,
} from "../../lib/chain/offer/offer.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS, OFFER_FLAGS } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class OfferInfo extends BaseCommand<typeof OfferInfo> {
  static override aliases = ["provider:oi"];
  static override description = "Get info about offers";
  static override flags = {
    ...baseFlags,
    ...OFFER_FLAGS,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(OfferInfo));
    const offers = await resolveCreatedOffers(flags);
    const offerInfoResult = await getOffersInfo(offers);
    commandObj.logToStderr(await offersInfoToString(offerInfoResult));
  }
}
