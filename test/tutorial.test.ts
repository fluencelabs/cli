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

import { cp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  FS_OPTIONS,
  TEMPLATE_INDEX_APP_IMPORTS,
  TEMPLATE_INDEX_APP_IMPORTS_COMMENT,
  MAIN_AQUA_FILE_ADD_ONE,
  MAIN_AQUA_FILE_ADD_ONE_COMMENT,
  MAIN_AQUA_FILE_APP_IMPORT_TEXT,
  MAIN_AQUA_FILE_APP_IMPORT_TEXT_COMMENT,
  TEMPLATE_INDEX_APP_REGISTER,
  TEMPLATE_INDEX_APP_REGISTER_COMMENT,
} from "../src/lib/const.js";
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

    await deploy(cwd);

    try {
      await uncommentCodeInMainAqua(cwd);

      await fluence({
        args: ["run"],
        flags: {
          f: 'helloWorld("Fluence")',
        },
        cwd,
      });

      await cp(
        join(process.cwd(), "test", "aqua", NEW_SERVICE_AQUA_FILE_NAME),
        join(cwd, "src", "aqua", NEW_SERVICE_AQUA_FILE_NAME)
      );

      expect(
        await fluence({
          args: ["run"],
          flags: {
            f: 'greeting("world")',
            i: join("src", "aqua", NEW_SERVICE_AQUA_FILE_NAME),
          },
          cwd,
        })
      ).toContain('"Hi, world"');
    } finally {
      await remove(cwd);
    }
  });

  maybeConcurrentTest("should work with ts template", async () => {
    const cwd = join("tmp", "shouldWorkWithTSTemplate");
    await init(cwd, "ts");
    await generateDefaultKey(cwd);
    await addAdderServiceToFluenceYAML(cwd);
    await deploy(cwd);

    try {
      await uncommentCodeInMainAqua(cwd);
      await compileAqua(cwd);
      const indexTSorJSPath = await uncommentJSorTSCode("ts", cwd);

      expect(
        await execPromise({
          command: "npx",
          args: ["ts-node", indexTSorJSPath],
          printOutput: true,
        })
      ).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
    } finally {
      await remove(cwd);
    }
  });

  maybeConcurrentTest("should work with js template", async () => {
    const cwd = join("tmp", "shouldWorkWithJSTemplate");
    await init(cwd, "js");
    await generateDefaultKey(cwd);
    await addAdderServiceToFluenceYAML(cwd);
    await deploy(cwd);

    try {
      await uncommentCodeInMainAqua(cwd);
      await compileAqua(cwd);
      const indexTSorJSPath = await uncommentJSorTSCode("js", cwd);

      expect(
        await execPromise({
          command: "node",
          args: [indexTSorJSPath],
          printOutput: true,
        })
      ).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
    } finally {
      await remove(cwd);
    }
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

    const parsedResult: unknown = JSON.parse(result);
    expect(parsedResult).toHaveProperty("air_version");
  });
});

const NEW_SERVICE_AQUA_FILE_NAME = "newService.aqua";

const addAdderServiceToFluenceYAML = (cwd: string) =>
  fluence({
    args: [
      "service",
      "add",
      "https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true",
    ],
    cwd,
  });

const deploy = (cwd: string) =>
  fluence({
    args: ["legacy", "deploy"],
    flags: {
      "no-input": true,
    },
    cwd,
  });

const generateDefaultKey = (cwd: string) =>
  fluence({
    args: ["key", "new", "default"],
    flags: {
      "no-input": true,
      default: true,
    },
    cwd,
  });

const uncommentCodeInMainAqua = async (cwd: string) => {
  const aquaFilePath = join(cwd, "src", "aqua", "main.aqua");

  const aquaFileContent = await readFile(aquaFilePath, FS_OPTIONS);

  const newAquaFileContent = aquaFileContent
    .replace(
      MAIN_AQUA_FILE_APP_IMPORT_TEXT_COMMENT,
      MAIN_AQUA_FILE_APP_IMPORT_TEXT
    )
    .replace(MAIN_AQUA_FILE_ADD_ONE_COMMENT, MAIN_AQUA_FILE_ADD_ONE);

  await writeFile(aquaFilePath, newAquaFileContent);
};

const remove = (cwd: string) =>
  fluence({
    args: ["legacy", "remove"],
    flags: {
      "no-input": true,
    },
    cwd,
  });

const compileAqua = (cwd: string) =>
  fluence({
    args: ["aqua"],
    cwd,
  });

const uncommentJSorTSCode = async (
  JSOrTs: "js" | "ts",
  cwd: string
): Promise<string> => {
  const indexTSorJSPath = join(cwd, "src", JSOrTs, "src", `index.${JSOrTs}`);

  const TSorJSFileContent = await readFile(indexTSorJSPath, FS_OPTIONS);

  const newTSorJSFileContent = TSorJSFileContent.replace(
    TEMPLATE_INDEX_APP_IMPORTS_COMMENT,
    TEMPLATE_INDEX_APP_IMPORTS
  ).replace(TEMPLATE_INDEX_APP_REGISTER_COMMENT, TEMPLATE_INDEX_APP_REGISTER);

  await writeFile(indexTSorJSPath, newTSorJSFileContent);
  return indexTSorJSPath;
};

const EXPECTED_TS_OR_JS_RUN_RESULT = "Hello, Fluence\n2\n";
