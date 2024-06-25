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

import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { versions } from "../versions.js";

import { initNewReadonlyModuleConfig } from "./configs/project/module.js";
import {
  FS_OPTIONS,
  MARINE_RS_SDK_CARGO_DEPENDENCY,
  MARINE_RS_SDK_TEST_CARGO_DEPENDENCY,
} from "./const.js";

export const generateNewModule = async (
  pathToModuleDir: string,
): Promise<void> => {
  await mkdir(pathToModuleDir, { recursive: true });
  const name = basename(pathToModuleDir);
  const newModuleSrcDirPath = join(pathToModuleDir, "src");
  await mkdir(newModuleSrcDirPath, { recursive: true });

  await writeFile(
    join(newModuleSrcDirPath, "main.rs"),
    MAIN_RS_CONTENT,
    FS_OPTIONS,
  );

  await writeFile(
    join(pathToModuleDir, "Cargo.toml"),
    getCargoTomlContent(name),
    FS_OPTIONS,
  );

  await initNewReadonlyModuleConfig(pathToModuleDir, name);
};

const MAIN_RS_CONTENT = `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub fn greeting(name: String) -> String {
    format!("Hi, {}", name)
}
`;

const getCargoTomlContent = (name: string): string => {
  return `[package]
name = "${name}"
version = "0.1.0"
edition = "2018"

[[bin]]
name = "${name}"
path = "src/main.rs"

[dependencies]
${MARINE_RS_SDK_CARGO_DEPENDENCY} = "${versions.cargo[MARINE_RS_SDK_CARGO_DEPENDENCY]}"

[dev-dependencies]
${MARINE_RS_SDK_TEST_CARGO_DEPENDENCY} = "${versions.cargo[MARINE_RS_SDK_TEST_CARGO_DEPENDENCY]}"
`;
};
