/**
 * Copyright 2022 Fluence Labs Limited
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

import assert from "node:assert";
import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";
import { Command } from "@oclif/core";

import { initNewReadonlyModuleConfig } from "../../lib/configs/project/module";
import {
  CommandObj,
  FS_OPTIONS,
  MARINE_RS_SDK_TEMPLATE_VERSION,
  MARINE_RS_SDK_TEST_TEMPLATE_VERSION,
  NO_INPUT_FLAG,
} from "../../lib/const";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { input } from "../../lib/prompt";

const PATH = "PATH";

export default class New extends Command {
  static override description = "Create new marine module template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: PATH,
      description: "Module path",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(New);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    const pathToModuleDir: unknown =
      args[PATH] ??
      (await input({ isInteractive, message: "Enter module path" }));

    assert(typeof pathToModuleDir === "string");
    await generateNewModule(pathToModuleDir, this);

    this.log(
      `Successfully generated template for new module at ${color.yellow(
        pathToModuleDir
      )}`
    );
  }
}

export const generateNewModule = async (
  pathToModuleDir: string,
  commandObj: CommandObj
): Promise<void> => {
  await fsPromises.mkdir(pathToModuleDir, { recursive: true });
  const name = path.basename(pathToModuleDir);

  const newModuleSrcDirPath = path.join(pathToModuleDir, "src");
  await fsPromises.mkdir(newModuleSrcDirPath, { recursive: true });

  await fsPromises.writeFile(
    path.join(newModuleSrcDirPath, "main.rs"),
    MAIN_RS_CONTENT,
    FS_OPTIONS
  );

  await fsPromises.writeFile(
    path.join(pathToModuleDir, "Cargo.toml"),
    getCargoTomlContent(name),
    FS_OPTIONS
  );

  await initNewReadonlyModuleConfig(pathToModuleDir, commandObj, name);
};

const MAIN_RS_CONTENT = `use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub fn greeting(name: String) -> String {
    format!("Hi, {}", name)
}
`;

const getCargoTomlContent = (name: string): string => `[package]
name = "${name}"
version = "0.1.0"
edition = "2018"

[[bin]]
name = "${name}"
path = "src/main.rs"

[dependencies]
marine-rs-sdk = "${MARINE_RS_SDK_TEMPLATE_VERSION}"

[dev-dependencies]
marine-rs-sdk-test = "${MARINE_RS_SDK_TEST_TEMPLATE_VERSION}"
`;
