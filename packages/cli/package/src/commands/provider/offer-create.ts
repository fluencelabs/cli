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

import { BaseCommand } from "../../baseCommand.js";
import { createOffers } from "../../lib/chain/offer/offer.js";
import { OFFER_FLAG, CHAIN_FLAGS } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CreateOffer extends BaseCommand<typeof CreateOffer> {
  static override hiddenAliases = ["provider:oc"];
  static override description = `Create offers. You have to be registered as a provider to do that${aliasesText.apply(this)}`;
  static override flags = {
    ...CHAIN_FLAGS,
    ...OFFER_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CreateOffer));
    await createOffers(flags);
  }
}
