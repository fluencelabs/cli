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
import { removeOffers } from "../../lib/chain/offer/updateOffers.js";
import { CHAIN_FLAGS, OFFER_FLAGS } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class OfferRemove extends BaseCommand<typeof OfferRemove> {
  static override hiddenAliases = ["provider:or"];
  static override description = `Remove offers${aliasesText.apply(this)}`;
  static override flags = {
    ...OFFER_FLAGS,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(OfferRemove));
    await removeOffers(flags);
  }
}
