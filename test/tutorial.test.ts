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

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { execPromise } from "../src/lib/execPromise.js";

import { fluence, init, maybeConcurrentTest, multiaddrs } from "./helpers.js";

describe("tutorial", () => {
  maybeConcurrentTest("should work with minimal template", async () => {
    const cwd = join("tmp", "shouldWorkWithMinimalTemplate");
    await init(cwd, "minimal");
    await generateDefaultKey(cwd);
    await addAdderServiceToFluenceYAML(cwd);

    await fluence({
      args: ["run"],
      flags: {
        f: 'helloWorld("Fluence")',
      },
      cwd,
    });

    await fluence({
      args: ["service", "new", "./src/services/newService"],
      flags: {
        "no-input": true,
      },
      cwd,
    });

    await writeFile(
      join(cwd, "src", "services", "newService", "service.yaml"),
      `
version: 0
name: new
modules:
  facade:
    get: modules/newService
    envs:
      A: B
`
    );

    await fluence({
      args: ["run"],
      flags: {
        f: 'helloWorld("Fluence")',
      },
      cwd,
    });
  });

  maybeConcurrentTest("should work with ts template", async () => {
    const cwd = join("tmp", "shouldWorkWithTSTemplate");
    await init(cwd, "ts");
    await generateDefaultKey(cwd);
    await addAdderServiceToFluenceYAML(cwd);
    await compileAqua(cwd);

    expect(
      (
        await execPromise({
          command: "npx",
          args: ["ts-node", getIndexJSorTSPath("ts", cwd)],
          printOutput: true,
        })
      ).trim()
    ).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
  });

  maybeConcurrentTest("should work with js template", async () => {
    const cwd = join("tmp", "shouldWorkWithJSTemplate");
    await init(cwd, "js");
    await generateDefaultKey(cwd);
    await addAdderServiceToFluenceYAML(cwd);
    await compileAqua(cwd);

    expect(
      (
        await execPromise({
          command: "node",
          args: [getIndexJSorTSPath("js", cwd)],
          printOutput: true,
        })
      ).trim()
    ).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
  });

  maybeConcurrentTest("should work without project", async () => {
    const result = await fluence({
      args: ["run"],
      flags: {
        f: "identify()",
        i: join("test", "aqua", "smoke.aqua"),
        relay: multiaddrs[0]?.multiaddr,
        quiet: true,
      },
    });

    const parsedResult = JSON.parse(result);
    expect(parsedResult).toHaveProperty("air_version");
  });
});

const addAdderServiceToFluenceYAML = (cwd: string) => {
  return fluence({
    args: [
      "service",
      "add",
      "https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true",
    ],
    cwd,
  });
};

const generateDefaultKey = (cwd: string) => {
  return fluence({
    args: ["key", "new", "default"],
    flags: {
      "no-input": true,
      default: true,
    },
    cwd,
  });
};

const compileAqua = (cwd: string) => {
  return fluence({
    args: ["aqua"],
    cwd,
  });
};

const getIndexJSorTSPath = (JSOrTs: "js" | "ts", cwd: string): string => {
  return join(cwd, "src", JSOrTs, "src", `index.${JSOrTs}`);
};

const EXPECTED_TS_OR_JS_RUN_RESULT = "Hello, Fluence";
