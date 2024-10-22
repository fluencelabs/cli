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

import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { dealUpdate } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class ChangeApp extends BaseCommand<typeof ChangeApp> {
  hidden = true;
  static override description = "Change app id in the deal";
  static override flags = {
    ...CHAIN_FLAGS,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
    "NEW-APP-CID": Args.string({
      description: "New app CID for the deal",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(ChangeApp));

    await dealUpdate({
      dealAddress:
        args["DEAL-ADDRESS"] ??
        (await input({ message: "Enter deal address" })),
      appCID:
        args["NEW-APP-CID"] ?? (await input({ message: "Enter new app CID" })),
    });
  }
}
