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

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { compileFromPath } from "@fluencelabs/aqua-api";
import aquaToJs from "@fluencelabs/aqua-to-js";
import { gatherImportsFromNpm } from "@fluencelabs/npm-aqua-compiler";

import {
  AQUA_DEPENDENCIES_DIR_NAME,
  AQUA_EXT,
  FS_OPTIONS,
  NODE_MODULES_DIR_NAME,
} from "./lib/const.js";
import { jsonStringify } from "./lib/helpers/utils.js";
import { versions } from "./versions.js";

const WORKSPACE_NODE_MODULES_PATH = resolve("..", NODE_MODULES_DIR_NAME);

const aquaDependenciesDirPath = join("src", AQUA_DEPENDENCIES_DIR_NAME);
await mkdir(aquaDependenciesDirPath, { recursive: true });

await writeFile(
  join(aquaDependenciesDirPath, "package.json"),
  jsonStringify({ dependencies: versions.npm }),
  FS_OPTIONS,
);

const VERSIONS_DIR_PATH = join("src", "versions");
const SRC_LIB_PATH = join("src", "lib");
const COMPILED_AQUA_PATH = join(SRC_LIB_PATH, "compiled-aqua");

const COMPILED_AQUA_WITH_TRACING_PATH = join(
  SRC_LIB_PATH,
  "compiled-aqua-with-tracing",
);

const COMPILED_INSTALLATION_SPELL_AQUA_PATH = join(
  COMPILED_AQUA_PATH,
  "installation-spell",
);

const COMPILED_INSTALLATION_SPELL_AQUA_WITH_TRACING_PATH = join(
  COMPILED_AQUA_WITH_TRACING_PATH,
  "installation-spell",
);

const CLI_AQUA_DEPENDENCIES_DIR_PATH = resolve(
  join("src", "cli-aqua-dependencies"),
);

const INSTALLATION_SPELL_DIR_PATH = join(
  CLI_AQUA_DEPENDENCIES_DIR_PATH,
  NODE_MODULES_DIR_NAME,
  "@fluencelabs",
  "installation-spell",
);

const INSTALLATION_SPELL_AQUA_DIR_PATH = join(
  INSTALLATION_SPELL_DIR_PATH,
  "src",
  "aqua",
);

const imports = await gatherImportsFromNpm({
  npmProjectDirPath: CLI_AQUA_DEPENDENCIES_DIR_PATH,
  aquaToCompileDirPath: INSTALLATION_SPELL_DIR_PATH,
});

async function compileInstallationSpellAqua(tracing = false) {
  return Promise.all(
    ["upload", "cli", "deal_spell", "files", "deploy"].map(async (fileName) => {
      const filePath = join(
        INSTALLATION_SPELL_AQUA_DIR_PATH,
        `${fileName}.${AQUA_EXT}`,
      );

      const compilationResult = await compileFromPath({
        filePath,
        imports,
        tracing,
      });

      if (compilationResult.errors.length !== 0) {
        throw new Error(compilationResult.errors.join("\n\n"));
      }

      const { sources } = (await aquaToJs(compilationResult, "ts")) ?? {};

      if (sources === undefined) {
        throw new Error(
          `File ${filePath} no longer exposes anything. Please expose something from it or remove it from compilation`,
        );
      }

      await writeFile(
        join(
          tracing
            ? COMPILED_INSTALLATION_SPELL_AQUA_WITH_TRACING_PATH
            : COMPILED_INSTALLATION_SPELL_AQUA_PATH,
          `${fileName}.ts`,
        ),
        sources,
        FS_OPTIONS,
      );
    }),
  );
}

await rm(VERSIONS_DIR_PATH, { recursive: true, force: true });
await mkdir(VERSIONS_DIR_PATH, { recursive: true });
await cp("package.json", join(VERSIONS_DIR_PATH, "cli.package.json"));

await cp(
  join(
    WORKSPACE_NODE_MODULES_PATH,
    "@fluencelabs",
    "js-client",
    "package.json",
  ),
  join(VERSIONS_DIR_PATH, "js-client.package.json"),
);

await rm(COMPILED_AQUA_PATH, { recursive: true, force: true });
await mkdir(COMPILED_INSTALLATION_SPELL_AQUA_PATH, { recursive: true });

await mkdir(COMPILED_INSTALLATION_SPELL_AQUA_WITH_TRACING_PATH, {
  recursive: true,
});

await Promise.all([
  compileInstallationSpellAqua(),
  compileInstallationSpellAqua(true),
]);
