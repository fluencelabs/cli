/**
 * Copyright 2022 Fluence Labs Limited
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
import path from "node:path";

import {
  FS_OPTIONS,
  getTemplateIndexAppImports,
  getTemplateIndexAppImportsComment,
  MAIN_AQUA_FILE_ADD_ONE,
  MAIN_AQUA_FILE_ADD_ONE_COMMENT,
  MAIN_AQUA_FILE_APP_IMPORT_TEXT,
  MAIN_AQUA_FILE_APP_IMPORT_TEXT_COMMENT,
  TEMPLATE_INDEX_APP_REGISTER,
  TEMPLATE_INDEX_APP_REGISTER_COMMENT,
} from "../src/lib/const";
import { execPromise } from "../src/lib/execPromise";
import { localMultiaddrs } from "../src/lib/localNodes";

import { fluence, init } from "./helpers";

describe("tutorial", () => {
  beforeAll(async () => {
    const cwd = path.join("tmp", "installMarine");
    await init(cwd, "minimal");

    await fluence({
      args: ["dep", "cargo", "i", "marine"],
      flags: {
        "no-input": true,
      },
      cwd,
    });
  });

  test.concurrent("should work with minimal template", async () => {
    const cwd = path.join("tmp", "shouldWorkWithMinimalTemplate");
    await init(cwd, "minimal");
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
        path.join(process.cwd(), "test", "aqua", NEW_SERVICE_AQUA_FILE_NAME),
        path.join(cwd, "src", "aqua", NEW_SERVICE_AQUA_FILE_NAME)
      );

      expect(
        await fluence({
          args: ["run"],
          flags: {
            f: 'greeting("world")',
            i: path.join("src", "aqua", NEW_SERVICE_AQUA_FILE_NAME),
          },
          cwd,
        })
      ).toContain('"Hi, world"');
    } finally {
      await remove(cwd);
    }
  });

  test.concurrent("should work with ts template", async () => {
    const cwd = path.join("tmp", "shouldWorkWithTSTemplate");
    await init(cwd, "ts");
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

  test.concurrent("should work with js template", async () => {
    const cwd = path.join("tmp", "shouldWorkWithJSTemplate");
    await init(cwd, "js");
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

  test.concurrent("should work without project", async () => {
    const result = await fluence({
      args: ["run"],
      flags: {
        f: "identify()",
        i: path.join("test", "aqua", "smoke.aqua"),
        relay: localMultiaddrs[0],
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
    args: ["deploy"],
    flags: {
      "no-input": true,
    },
    cwd,
  });

const uncommentCodeInMainAqua = async (cwd: string) => {
  const aquaFilePath = path.join(cwd, "src", "aqua", "main.aqua");

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
    args: ["remove"],
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
  const indexTSorJSPath = path.join(
    cwd,
    "src",
    JSOrTs,
    "src",
    `index.${JSOrTs}`
  );

  const TSorJSFileContent = await readFile(indexTSorJSPath, FS_OPTIONS);

  const newTSorJSFileContent = TSorJSFileContent.replace(
    getTemplateIndexAppImportsComment(JSOrTs === "js"),
    getTemplateIndexAppImports(JSOrTs === "js")
  ).replace(TEMPLATE_INDEX_APP_REGISTER_COMMENT, TEMPLATE_INDEX_APP_REGISTER);

  await writeFile(indexTSorJSPath, newTSorJSFileContent);
  return indexTSorJSPath;
};

const EXPECTED_TS_OR_JS_RUN_RESULT = "Hello, Fluence\n2\n";
