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
import { updateOffers } from "../../lib/chain/offer/updateOffers.js";
import { CHAIN_FLAGS, OFFER_FLAG } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class OfferUpdate extends BaseCommand<typeof OfferUpdate> {
  static override hiddenAliases = ["provider:ou"];
  static override description = `Update offers${aliasesText.apply(this)}`;
  static override flags = {
    ...OFFER_FLAG,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(OfferUpdate));
    await updateOffers(flags);
  }
}
