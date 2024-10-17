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
import { createCommitments } from "../../lib/chain/commitment.js";
import { NOX_NAMES_FLAG, CHAIN_FLAGS, OFFER_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CreateCommitment extends BaseCommand<
  typeof CreateCommitment
> {
  static override aliases = ["provider:cc"];
  static override description = "Create Capacity commitment";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...NOX_NAMES_FLAG,
    ...OFFER_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CreateCommitment));
    await createCommitments(flags);
  }
}
