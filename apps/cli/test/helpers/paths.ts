/**
 * Copyright 2024 Fluence DAO
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
  return join("tmp", "templates", template);
};
