/**
 * Copyright 2024 Fluence DAO
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
import { access, readdir, rm } from "node:fs/promises";
import { arch, platform } from "node:os";
import { join } from "node:path";

import { CustomColors } from "@oclif/color";
import { x as tar } from "tar";

import { CLI_NAME } from "../../src/lib/const.js";
import { execPromise, type ExecPromiseArg } from "../../src/lib/execPromise.js";
import { flagsToArgs } from "../../src/lib/helpers/utils.js";

type CliArg = {
  args?: ExecPromiseArg["args"];
  flags?: ExecPromiseArg["flags"];
  cwd?: string;
  timeout?: number;
};

const pathToDistDir = join(process.cwd(), "dist");
const pathToCliDir = join(pathToDistDir, CLI_NAME);

try {
  await access(pathToCliDir);
} catch {
  const files = await readdir(pathToDistDir);

  const archiveWithCLIFileName = files.find((name) => {
    return (
      name.startsWith(CLI_NAME) &&
      name.endsWith(`${platform()}-${arch()}.tar.gz`)
    );
  });

  assert(
    archiveWithCLIFileName !== undefined,
    "After successful build there should be an archive with CLI in the dist directory",
  );

  await rm(pathToCliDir, { recursive: true, force: true });

  await tar({
    cwd: pathToDistDir,
    file: join(pathToDistDir, archiveWithCLIFileName),
  });
}

const pathToBinDir = join(pathToCliDir, "bin");
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
