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

import { spawn } from "node:child_process";

import color from "@oclif/color";
import { ux } from "@oclif/core";

import { IS_DEVELOPMENT, TIMEOUT_FLAG_NAME } from "./const";
import { Flags, flagsToArgs } from "./helpers/flagsToArgs";

type SpawnParams = Parameters<typeof spawn>;

export type ExecPromiseArg = {
  command: SpawnParams[0];
  args?: SpawnParams[1] | undefined;
  flags?: Flags | undefined;
  options?: SpawnParams[2] | undefined;
  message?: string | undefined;
  timeout?: number | undefined;
  printOutput?: boolean | undefined;
};

export const execPromise = ({
  command,
  args,
  flags,
  options,
  message,
  timeout,
  printOutput = false,
}: ExecPromiseArg): Promise<string> => {
  const flagArgs = flags === undefined ? [] : flagsToArgs(flags);
  const allArgs = [...(args ?? []), ...flagArgs];
  const fullCommand = [command, ...allArgs].join(" ");

  const commandToDisplay = IS_DEVELOPMENT
    ? fullCommand
    : fullCommand.replace(
        /([\S\s]*--sk ).*([\S\s]*)/,
        "$1<SECRET_KEY_IS_HIDDEN>$2"
      );

  if (typeof message === "string") {
    ux.action.start(message);
  }

  const debugInfo = `Debug info:\n${commandToDisplay}\n`;

  return new Promise<string>((res, rej): void => {
    const execTimeout =
      timeout !== undefined &&
      setTimeout((): void => {
        if (typeof message === "string") {
          ux.action.stop(color.red("Timed out"));
        }

        childProcess.kill();

        rej(
          new Error(
            `Execution timed out: command didn't yield any result in ${color.yellow(
              `${timeout}ms`
            )}\nIt's best to just try again or increase timeout using ${color.yellow(
              `--${TIMEOUT_FLAG_NAME}`
            )} flag\n${debugInfo}`
          )
        );
      }, timeout);

    const childProcess = spawn(command, allArgs, options ?? {});

    let stdout = "";

    childProcess.stdout?.on("data", (data): void => {
      if (printOutput) {
        process.stdout.write(String(data));
      }

      stdout = `${stdout}${String(data)}`;
    });

    let stderr = "";

    childProcess.stderr?.on("data", (data): void => {
      if (printOutput) {
        process.stdout.write(String(data));
      }

      stderr = `${stderr}${String(data)}`;
    });

    childProcess.on("error", (error): void => {
      childProcess.kill();

      if (typeof message === "string") {
        ux.action.stop(color.red("failed"));
      }

      rej(new Error(`${String(error)}\n${debugInfo}`));
    });

    childProcess.on("close", (code): void => {
      childProcess.kill();

      if (typeof message === "string") {
        ux.action.stop(code === 0 ? "done" : color.red("failed"));
      }

      if (execTimeout !== false) {
        clearTimeout(execTimeout);
      }

      if (code !== 0) {
        rej(
          new Error(
            `process exited${
              code === null ? "" : ` with code ${code}`
            }\n${stderr}${debugInfo}`
          )
        );

        return;
      }

      if (stdout !== "") {
        res(stdout);
        return;
      }

      res(stderr);
    });
  });
};
