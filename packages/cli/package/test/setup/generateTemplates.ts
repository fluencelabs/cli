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

import { rm, mkdir } from "fs/promises";

import { fluence } from "../helpers/commonWithSetupTests.js";
import { fluenceEnv } from "../helpers/constants.js";
import { initializedTemplatePath } from "../helpers/paths.js";

await rm(initializedTemplatePath, { force: true, recursive: true });
await mkdir(initializedTemplatePath, { recursive: true });

await fluence({
  args: ["provider", "init"],
  flags: { env: fluenceEnv, "no-input": true },
  cwd: initializedTemplatePath,
});
