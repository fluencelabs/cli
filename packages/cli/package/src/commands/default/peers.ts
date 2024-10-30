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
import { setChainFlags } from "../../lib/chainFlags.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_ARG, ENV_ARG_NAME, ENV_FLAG_NAME } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveDefaultRelays } from "../../lib/multiaddres.js";

export default class Peers extends BaseCommand<typeof Peers> {
  static override description = "Print default Fluence network peer addresses";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override args = {
    ...ENV_ARG,
  };
  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(Peers));
    setChainFlags({ [ENV_FLAG_NAME]: args[ENV_ARG_NAME] });
    const relays = await resolveDefaultRelays();
    commandObj.log(relays.join("\n"));
  }
}
