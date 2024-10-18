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

import assert from "node:assert";
import { access, readdir } from "node:fs/promises";
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

const files = await readdir(pathToDistDir);

const archiveWithCLIFileName = files.find((name) => {
  return (
    name.startsWith(CLI_NAME) && name.endsWith(`${platform()}-${arch()}.tar.gz`)
  );
});

assert(
  archiveWithCLIFileName !== undefined,
  "After successful build there should be an archive with CLI in the dist directory",
);

try {
  await access(pathToCliDir);
} catch {
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
