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

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  fluence,
  fluenceEnv,
  getMultiaddrs,
  init,
  maybeConcurrentTest,
  NO_PROJECT_TEST_NAME,
} from "./helpers.js";

const multiaddrs = await getMultiaddrs();

describe("integration tests", () => {
  maybeConcurrentTest("should work with minimal template", async () => {
    const cwd = join("tmp", "shouldWorkWithMinimalTemplate");
    await init(cwd, "minimal");

    await fluence({
      args: ["run"],
      flags: {
        f: 'helloWorld("Fluence")',
      },
      cwd,
    });
  });

  maybeConcurrentTest("should work without project", async () => {
    const cwd = join("tmp", NO_PROJECT_TEST_NAME);
    await mkdir(cwd, { recursive: true });

    const result = await fluence({
      args: ["run"],
      flags: {
        relay: multiaddrs[0]?.multiaddr,
        env: fluenceEnv,
        f: "identify()",
        i: resolve(join("test", "_resources", "aqua", "smoke.aqua")),
        quiet: true,
      },
      cwd,
    });

    const parsedResult = JSON.parse(result);
    // Peer.identify() is supposed to return an object with air_version key
    expect(parsedResult).toHaveProperty("air_version");
  });
});
