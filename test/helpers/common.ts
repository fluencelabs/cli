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

import { cp, rm } from "node:fs/promises";
import { arch, platform } from "node:os";
import { join } from "node:path";

import { CustomColors } from "@oclif/color";

import { CLI_NAME, type Template } from "../../src/lib/const.js";
import { execPromise, type ExecPromiseArg } from "../../src/lib/execPromise.js";
import { flagsToArgs } from "../../src/lib/helpers/utils.js";

type CliArg = {
  args?: ExecPromiseArg["args"];
  flags?: ExecPromiseArg["flags"];
  cwd?: string;
  timeout?: number;
};

const pathToBinDir = join(
  process.cwd(),
  join("tmp", `${platform()}-${arch()}`, CLI_NAME, "bin"),
);

const pathToCliRunJS = join(pathToBinDir, "run.js");
const pathToNodeJS = join(pathToBinDir, "node");

export const fluence = async ({
  args = [],
  flags,
  cwd = process.cwd(),
  timeout = 1000 * 60 * 4, // 4 minutes,
}: CliArg): ReturnType<typeof execPromise> => {
  let res: string;

  args = ["--no-warnings", pathToCliRunJS, ...args];

  flags = {
    "no-input": true,
    ...flags,
  };

  console.log(
    CustomColors.addon(
      `${cwd} % ${pathToNodeJS} ${args.join(" ")} ${flagsToArgs(flags).join(
        " ",
      )}`,
    ),
  );

  try {
    res = await execPromise({
      command: pathToNodeJS,
      args,
      flags,
      options: { cwd },
      printOutput: true,
      timeout,
    });
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        // CHECK THE STACK TRACE BELOW TO SEE THE ERROR ORIGIN
        err.message,
      );
    }

    throw err;
  }

  return res;
};

export const getInitializedTemplatePath = (template: Template) => {
  return join("tmp", "templates", template);
};

export const initializeTemplate = async (
  cwd: string,
  template: Template,
): Promise<void> => {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await rm(cwd, { recursive: true });
  } catch {}

  await cp(templatePath, cwd, { recursive: true });
};
