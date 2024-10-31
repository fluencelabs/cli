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

import { CLI_NAME } from "../const.js";

export function aliasesText(this: { hiddenAliases: string[] }) {
  if (this.hiddenAliases.length === 0) {
    return "";
  }

  return `. Alias${this.hiddenAliases.length === 1 ? "" : "es"}: ${this.hiddenAliases
    .map((alias) => {
      return `${CLI_NAME} ${alias.split(":").join(" ")}`;
    })
    .join(", ")}`;
}
