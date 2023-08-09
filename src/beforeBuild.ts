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
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { compile } from "./lib/aqua.js";
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
    ["upload", "cli", "deal_spell", "files"].map(async (fileName) => {
      const compilationResult = await compile({
        filePath: join(
          INSTALLATION_SPELL_AQUA_DIR_PATH,
          `${fileName}.${AQUA_EXT}`,
        ),
        imports: ["node_modules"],
        targetType: "ts",
        tracing,
      });

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
  join("node_modules", "@fluencelabs", "js-client.node", "package.json"),
  join(VERSIONS_DIR_PATH, "js-client.package.json"),
);

await rm(COMPILED_AQUA_PATH, { recursive: true, force: true });
await mkdir(COMPILED_INSTALLATION_SPELL_AQUA_PATH, { recursive: true });

await mkdir(COMPILED_INSTALLATION_SPELL_AQUA_WITH_TRACING_PATH, {
  recursive: true,
});

await compileInstallationSpellAqua();
await compileInstallationSpellAqua(true);
