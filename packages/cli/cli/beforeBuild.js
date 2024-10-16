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

// @ts-check
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { compileFromPath } from "@fluencelabs/aqua-api";
import aquaToJs from "@fluencelabs/aqua-to-js";
import { gatherImportsFromNpm } from "@fluencelabs/npm-aqua-compiler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORKSPACE_NODE_MODULES_PATH = resolve(__dirname, "node_modules");

const VERSIONS_DIR_PATH = join(__dirname, "src", "versions");
const SRC_LIB_PATH = join(__dirname, "src", "lib");
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
  join(__dirname, "src", "cli-aqua-dependencies"),
);

const INSTALLATION_SPELL_DIR_PATH = join(
  CLI_AQUA_DEPENDENCIES_DIR_PATH,
  "node_modules",
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
        `${fileName}.aqua`,
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
        "utf-8",
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

await cp(
  resolve(__dirname, "..", "..", "common", "src", "index.ts"),
  resolve(__dirname, "src", "common.ts"),
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
