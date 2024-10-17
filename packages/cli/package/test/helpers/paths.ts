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

import { join } from "node:path";

import type { Template } from "../../src/lib/const.js";
import {
  getServicesDir,
  getSpellsDir,
  getSrcPath,
} from "../../src/lib/paths.js";

export const TEST_AQUA_DIR_PATH = join("test", "_resources", "aqua");
export const pathToTheTemplateWhereLocalEnvironmentIsSpunUp = join(
  "test",
  "tmp",
  "templates",
  "quickstart",
);

export function getServiceDirPath(cwd: string, serviceName: string) {
  return join(getServicesDir(cwd), serviceName);
}

export function getModuleDirPath(
  cwd: string,
  moduleName: string,
  serviceName?: string,
) {
  if (serviceName === undefined) {
    return join(getSrcPath(cwd), "modules", moduleName);
  }

  return join(getServiceDirPath(cwd, serviceName), moduleName);
}

export function getMainRsPath(
  cwd: string,
  moduleName: string,
  serviceName?: string,
) {
  return join(getModuleDirPath(cwd, moduleName, serviceName), "src", "main.rs");
}

export function getSpellAquaPath(cwd: string, spellName: string) {
  return join(getSrcPath(cwd), "spells", spellName, "spell.aqua");
}

export function getSpellDirPath(cwd: string, spellName: string) {
  return join(getSpellsDir(cwd), spellName);
}

export const getInitializedTemplatePath = (template: Template) => {
  return join("test", "tmp", "templates", template);
};
