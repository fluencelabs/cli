/**
 * Copyright 2023 Fluence Labs Limited
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

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import versions from "../versions.json" assert { type: "json" };

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
  const name = path.basename(pathToModuleDir);
  const newModuleSrcDirPath = path.join(pathToModuleDir, "src");
  await mkdir(newModuleSrcDirPath, { recursive: true });

  await writeFile(
    path.join(newModuleSrcDirPath, "main.rs"),
    MAIN_RS_CONTENT,
    FS_OPTIONS,
  );

  await writeFile(
    path.join(pathToModuleDir, "Cargo.toml"),
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
