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
import { jsonStringify } from "../../common.js";
import {
  getDetailedCommitmentsInfoGroupedByStatus,
  stringifyDetailedCommitmentsInfo,
} from "../../lib/chain/commitment.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS, CC_FLAGS, JSON_FLAG } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CCInfo extends BaseCommand<typeof CCInfo> {
  static override hiddenAliases = ["provider:ci"];
  static override description = `Get info about capacity commitments${aliasesText.apply(this)}`;
  static override flags = {
    ...CHAIN_FLAGS,
    ...CC_FLAGS,
    ...JSON_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CCInfo));

    const ccInfo = await getDetailedCommitmentsInfoGroupedByStatus(flags);

    commandObj.log(
      flags.json
        ? jsonStringify(
            ccInfo.flatMap(({ CCs }) => {
              return CCs;
            }),
          )
        : stringifyDetailedCommitmentsInfo(ccInfo),
    );
  }
}
