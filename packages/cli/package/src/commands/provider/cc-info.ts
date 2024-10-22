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
import {
  printCommitmentsInfo,
  printCommitmentsInfoJSON,
} from "../../lib/chain/commitment.js";
import { CHAIN_FLAGS, CC_FLAGS, JSON_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CCInfo extends BaseCommand<typeof CCInfo> {
  static override aliases = ["provider:ci"];
  static override description = "Get info about capacity commitments";
  static override flags = {
    ...CHAIN_FLAGS,
    ...CC_FLAGS,
    ...JSON_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CCInfo));

    if (flags.json) {
      await printCommitmentsInfoJSON(flags);
    } else {
      await printCommitmentsInfo(flags);
    }
  }
}
