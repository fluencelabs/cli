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
import { DEPLOYMENT_NAMES_ARG } from "../../lib/const.js";
import {
  DEPLOY_DESCRIPTION,
  DEPLOY_EXAMPLES,
  DEPLOY_FLAGS,
  deployImpl,
} from "../../lib/deploy.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override hidden = true;
  static override description = DEPLOY_DESCRIPTION;
  static override examples = DEPLOY_EXAMPLES;
  static override flags = DEPLOY_FLAGS;
  static override args = DEPLOYMENT_NAMES_ARG;
  async run(): Promise<void> {
    await deployImpl.bind(this)(Deploy);
  }
}
