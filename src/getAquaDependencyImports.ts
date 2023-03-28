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
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { FS_OPTIONS } from "./lib/const.js";

const main = async (): Promise<void> => {
  const peerDependency = process.argv[2];
  assert(peerDependency !== undefined);

  const peerDependencyPackageJSONPath = join(
    "node_modules",
    peerDependency,
    "package.json"
  );

  const peerDependencyPackageJSON = await readFile(
    peerDependencyPackageJSONPath,
    FS_OPTIONS
  );

  const parsedPackageJSON: unknown = JSON.parse(peerDependencyPackageJSON);

  assert(
    typeof parsedPackageJSON === "object" &&
      parsedPackageJSON !== null &&
      "dependencies" in parsedPackageJSON
  );

  const paths = Object.entries(parsedPackageJSON?.dependencies ?? {}).map(
    ([name, version]) =>
      `node_modules/.pnpm/${name.replace("/", "+")}@${String(
        version
      )}/node_modules`
  );

  const validImports = await Promise.allSettled(paths.map((p) => access(p)));

  console.log(
    paths
      .filter((_, i) => validImports[i]?.status === "fulfilled")
      .map((p) => `--import ${p}`)
      .join(" ")
  );
};

main().catch(console.error);
