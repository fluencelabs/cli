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

import { writeFile } from "fs/promises";

import { yamlDiffPatch } from "yaml-diff-patch";

import { pathExists } from "../../helpers/utils.js";
import { ensureDockerComposeConfigPath } from "../../paths.js";

import { chainContainers } from "./chainContainers.js";

export async function ensureDockerComposeConfig() {
  const configPath = await ensureDockerComposeConfigPath();

  if (!(await pathExists(configPath))) {
    await writeFile(configPath, yamlDiffPatch("", {}, chainContainers));
  }

  return configPath;
}

export async function checkDockerComposeConfigExists() {
  const configPath = await ensureDockerComposeConfigPath();
  return (await pathExists(configPath)) ? configPath : null;
}
