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

import { cp } from "fs/promises";
import assert from "node:assert";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect } from "vitest";

import { FS_OPTIONS, PACKAGE_JSON_FILE_NAME } from "../../src/lib/const.js";
import { fluenceEnv, NO_PROJECT_TEST_NAME } from "../helpers/constants.js";
import { pathToTheTemplateWhereLocalEnvironmentIsSpunUp } from "../helpers/paths.js";
import {
  getMultiaddrs,
  initializeTemplate,
  runAquaFunction,
} from "../helpers/sharedSteps.js";
import { wrappedTest } from "../helpers/utils.js";

describe("integration tests", () => {
  wrappedTest("should work with minimal template", async () => {
    const cwd = join("test", "tmp", "shouldWorkWithMinimalTemplate");
    await initializeTemplate(cwd, "minimal");

    await runAquaFunction(cwd, "helloWorld", ["Fluence"]);
  });

  wrappedTest("should work without project", async () => {
    const cwd = join("test", "tmp", NO_PROJECT_TEST_NAME);

    await cp(
      join("test", "_resources", "aqua", "smoke.aqua"),
      join(cwd, "smoke.aqua"),
    );

    const packageJSONContent = await readFile(
      PACKAGE_JSON_FILE_NAME,
      FS_OPTIONS,
    );

    await rm(PACKAGE_JSON_FILE_NAME);

    const [{ multiaddr: relay = undefined } = {}] = await getMultiaddrs(
      pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
    );

    assert(
      relay !== undefined,
      "Unreachable. We always have multiaddrs for local network",
    );

    try {
      const result = await runAquaFunction(cwd, "identify", [], {
        relay,
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
