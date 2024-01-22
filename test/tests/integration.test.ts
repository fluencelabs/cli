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

import { cp } from "fs/promises";
import assert from "node:assert";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { FS_OPTIONS, PACKAGE_JSON_FILE_NAME } from "../../src/lib/const.js";
import { fluenceEnv, NO_PROJECT_TEST_NAME } from "../helpers/constants.js";
import {
  initializeTemplate,
  multiaddrs,
  runAquaFunction,
} from "../helpers/sharedSteps.js";
import { maybeConcurrentTest } from "../helpers/testWrapper.js";

describe("integration tests", () => {
  maybeConcurrentTest("should work with minimal template", async () => {
    const cwd = join("tmp", "shouldWorkWithMinimalTemplate");
    await initializeTemplate(cwd, "minimal");

    await runAquaFunction(cwd, "helloWorld", ["Fluence"]);
  });

  maybeConcurrentTest("should work without project", async () => {
    const cwd = join("tmp", NO_PROJECT_TEST_NAME);

    await cp(
      join("test", "_resources", "aqua", "smoke.aqua"),
      join(cwd, "smoke.aqua"),
    );

    const packageJSONContent = await readFile(
      PACKAGE_JSON_FILE_NAME,
      FS_OPTIONS,
    );

    await rm(PACKAGE_JSON_FILE_NAME);

    try {
      assert(multiaddrs[0] !== undefined, "multiaddrs is undefined");

      const result = await runAquaFunction(cwd, "identify", [], {
        relay: multiaddrs[0].multiaddr,
        env: fluenceEnv,
        i: "smoke.aqua",
      });

      const parsedResult = JSON.parse(result);
      // Peer.identify() is supposed to return an object with air_version key
      expect(parsedResult).toHaveProperty("air_version");
    } finally {
      await writeFile(PACKAGE_JSON_FILE_NAME, packageJSONContent, FS_OPTIONS);
    }
  });
});
