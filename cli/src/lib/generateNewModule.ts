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
import { basename, join, relative } from "node:path";

import { versions } from "../versions.js";

import { initNewReadonlyModuleConfig } from "./configs/project/module.js";
import {
  FS_OPTIONS,
  MARINE_RS_SDK_CARGO_DEPENDENCY,
  MARINE_RS_SDK_TEST_CARGO_DEPENDENCY,
} from "./const.js";
import { getServiceConfigTomlPath } from "./helpers/serviceConfigToml.js";

export async function generateNewModule(
  pathToModuleDir: string,
  serviceName: string | undefined,
): Promise<void> {
  await mkdir(pathToModuleDir, { recursive: true });
  const name = basename(pathToModuleDir);
  const newModuleSrcDirPath = join(pathToModuleDir, "src");
  await mkdir(newModuleSrcDirPath, { recursive: true });

  await writeFile(
    join(newModuleSrcDirPath, "main.rs"),
    await getMainRsContent(newModuleSrcDirPath, serviceName),
    FS_OPTIONS,
  );

  await writeFile(
    join(pathToModuleDir, "Cargo.toml"),
    getCargoTomlContent(name),
    FS_OPTIONS,
  );

  await initNewReadonlyModuleConfig(pathToModuleDir, name);
}

async function getMainRsContent(
  newModuleSrcDirPath: string,
  serviceName: string | undefined,
) {
  return `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub fn greeting(name: String) -> String {
    format!("Hi, {}", name)
}${await getTestExample(newModuleSrcDirPath, serviceName)}
`;
}

async function getTestExample(
  newModuleSrcDirPath: string,
  serviceName: string | undefined,
) {
  if (serviceName === undefined) {
    return "";
  }

  const serviceConfigTomlPath = await getServiceConfigTomlPath(serviceName);
  const relativePath = relative(newModuleSrcDirPath, serviceConfigTomlPath);

  return `

#[cfg(test)]
mod tests {
    use marine_rs_sdk_test::marine_test;

    #[marine_test(config_path = "${relativePath}")]
    fn empty_string(greeting: marine_test_env::myService::ModuleInterface) {
        let actual = greeting.greeting(String::new());
        assert_eq!(actual, "Hi, ");
    }

    #[marine_test(config_path = "${relativePath}")]
    fn non_empty_string(greeting: marine_test_env::myService::ModuleInterface) {
        let actual = greeting.greeting("name".to_string());
        assert_eq!(actual, "Hi, name");
    }
}`;
}

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
