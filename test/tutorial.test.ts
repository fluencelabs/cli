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
  Template,
  templates,
  TEMPLATE_INDEX_APP_REGISTER,
  TEMPLATE_INDEX_APP_REGISTER_COMMENT,
} from "../src/lib/const";
import { execPromise } from "../src/lib/execPromise";

import { fluence, Test, testUsingTemplates } from "./helpers";

const NEW_SERVICE_AQUA_FILE_NAME = "newService.aqua";

const tutorial = (template: Template): Test => ({
  name: `should work with "${template}" template`,
  template,
  async callback(cwd) {
    await fluence({
      args: [
        "service",
        "add",
        "https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true",
      ],
      cwd,
    });

    if (template === "minimal") {
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
    }

    try {
      await fluence({
        args: ["deploy"],
        flags: {
          "no-input": true,
        },
        cwd,
      });

      const aquaFilePath = path.join(cwd, "src", "aqua", "main.aqua");

      const aquaFileContent = await readFile(aquaFilePath, FS_OPTIONS);

      const newAquaFileContent = aquaFileContent
        .replace(
          MAIN_AQUA_FILE_APP_IMPORT_TEXT_COMMENT,
          MAIN_AQUA_FILE_APP_IMPORT_TEXT
        )
        .replace(MAIN_AQUA_FILE_ADD_ONE_COMMENT, MAIN_AQUA_FILE_ADD_ONE);

      await writeFile(aquaFilePath, newAquaFileContent);

      if (template === "minimal") {
        await fluence({
          args: ["run"],
          flags: {
            f: 'helloWorld("Fluence")',
          },
          cwd,
        });

        const pathToNewServiceAqua = path.join(
          cwd,
          "src",
          "aqua",
          NEW_SERVICE_AQUA_FILE_NAME
        );

        await cp(
          path.join(process.cwd(), "test", "aqua", NEW_SERVICE_AQUA_FILE_NAME),
          pathToNewServiceAqua
        );

        expect(
          await fluence({
            args: ["run"],
            flags: {
              f: 'greeting("world")',
              i: "./src/aqua/newService.aqua",
            },
            cwd,
          })
        ).toBe('"Hi, world"\n\nResult:\n\n"Hi, world"\n\n');
      }

      if (template === "ts" || template === "js") {
        await fluence({
          args: ["aqua"],
          cwd,
        });

        const indexTSorJSPath = path.join(
          cwd,
          "src",
          template,
          "src",
          `index.${template}`
        );

        const TSorJSFileContent = await readFile(indexTSorJSPath, FS_OPTIONS);

        const newTSorJSFileContent = TSorJSFileContent.replace(
          getTemplateIndexAppImportsComment(template === "js"),
          getTemplateIndexAppImports(template === "js")
        ).replace(
          TEMPLATE_INDEX_APP_REGISTER_COMMENT,
          TEMPLATE_INDEX_APP_REGISTER
        );

        await writeFile(indexTSorJSPath, newTSorJSFileContent);

        const expectedTSorJSRunResult = "Hello, Fluence\n2\n";

        if (template === "ts") {
          expect(
            await execPromise({
              command: "npx",
              args: ["ts-node", indexTSorJSPath],
            })
          ).toBe(expectedTSorJSRunResult);
        } else if (template === "js") {
          expect(
            await execPromise({
              command: "node",
              args: [indexTSorJSPath],
            })
          ).toBe(expectedTSorJSRunResult);
        }
      }
    } finally {
      await fluence({
        args: ["remove"],
        flags: {
          "no-input": true,
        },
        cwd,
      });
    }
  },
});

testUsingTemplates({
  description: "tutorial",
  tests: templates.map((template) => tutorial(template)),
});
