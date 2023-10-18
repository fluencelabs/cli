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

import assert from "node:assert";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { compileFromPath } from "@fluencelabs/aqua-api";

import { AQUA_EXT, FS_OPTIONS } from "./lib/const.js";

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

const INSTALLATION_SPELL_AQUA_DIR_PATH = join(
  "node_modules",
  "@fluencelabs",
  "installation-spell",
  "src",
  "aqua",
);

const compileInstallationSpellAqua = async (tracing = false) => {
  return Promise.all(
    ["upload", "cli", "deal_spell", "files", "deploy"].map(async (fileName) => {
      const compilationResult = await compileFromPath({
        filePath: join(
          INSTALLATION_SPELL_AQUA_DIR_PATH,
          `${fileName}.${AQUA_EXT}`,
        ),
        imports: ["node_modules"],
        targetType: "ts",
        tracing,
      });

      if (compilationResult.errors.length !== 0) {
        throw new Error(compilationResult.errors.join("\n\n"));
      }

      const tsSource = compilationResult.generatedSources[0]?.tsSource;
      assert(typeof tsSource === "string");

      await writeFile(
        join(
          tracing
            ? COMPILED_INSTALLATION_SPELL_AQUA_WITH_TRACING_PATH
            : COMPILED_INSTALLATION_SPELL_AQUA_PATH,
          `${fileName}.ts`,
        ),
        tsSource,
        FS_OPTIONS,
      );
    }),
  );
};

await rm(VERSIONS_DIR_PATH, { recursive: true, force: true });
await mkdir(VERSIONS_DIR_PATH, { recursive: true });
await cp("package.json", join(VERSIONS_DIR_PATH, "cli.package.json"));

await cp(
  join("node_modules", "@fluencelabs", "js-client", "package.json"),
  join(VERSIONS_DIR_PATH, "js-client.package.json"),
);

await rm(COMPILED_AQUA_PATH, { recursive: true, force: true });
await mkdir(COMPILED_INSTALLATION_SPELL_AQUA_PATH, { recursive: true });

await mkdir(COMPILED_INSTALLATION_SPELL_AQUA_WITH_TRACING_PATH, {
  recursive: true,
});

await compileInstallationSpellAqua();
await compileInstallationSpellAqua(true);

const BIN_FILE_PATH = join(
  join("node_modules", "oclif", "lib", "tarballs"),
  "bin.js",
);

try {
  const binFileContent = await readFile(BIN_FILE_PATH, FS_OPTIONS);

  const search = `#!/usr/bin/env bash`;
  const insert = `export NODE_NO_WARNINGS=1`;
  const hasSearch = binFileContent.includes(search);
  const hasInsert = binFileContent.includes(insert);

  if (hasSearch && !hasInsert) {
    const newBinFileContent = binFileContent.replace(
      search,
      `${search}\n${insert}`,
    );

    await writeFile(BIN_FILE_PATH, newBinFileContent, FS_OPTIONS);
  } else if (!hasSearch) {
    throw new Error(`Wasn't able to find '${search}' in ${BIN_FILE_PATH}`);
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`Error while modifying ${BIN_FILE_PATH}`);
  throw err;
}
