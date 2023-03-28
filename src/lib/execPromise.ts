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

import { spawn } from "node:child_process";

import oclifColor from "@oclif/color";
import { CLIError } from "@oclif/core/lib/errors/index.js";

const color = oclifColor.default;

import {
  IS_DEVELOPMENT,
  MARINE_CARGO_DEPENDENCY,
  TIMEOUT_FLAG_NAME,
} from "./const.js";
import { Flags, flagsToArgs } from "./helpers/flagsToArgs.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";

type SpawnParams = Parameters<typeof spawn>;

export type ExecPromiseArg = {
  command: SpawnParams[0];
  args?: SpawnParams[1] | undefined;
  flags?: Flags | undefined;
  options?: SpawnParams[2] | undefined;
  spinnerMessage?: string | undefined;
  timeout?: number | undefined;
  printOutput?: boolean | undefined;
};

export const execPromise = ({
  command,
  args,
  flags,
  options,
  spinnerMessage,
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

  if (typeof spinnerMessage === "string") {
    startSpinner(spinnerMessage);
  }

  const debugInfo = `Debug info:\n${commandToDisplay}\n`;

  return new Promise<string>((res, rej): void => {
    const execTimeout =
      timeout !== undefined &&
      setTimeout((): void => {
        if (typeof spinnerMessage === "string") {
          stopSpinner(color.red("Timed out"));
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

    childProcess.stdout?.on("data", (data: Buffer): void => {
      if (printOutput) {
        process.stdout.write(data);
      }

      stdout = `${stdout}${data.toString()}`;
    });

    let stderr = "";

    childProcess.stderr?.on("data", (data: Buffer): void => {
      if (printOutput) {
        process.stderr.write(data);
      }

      stderr = `${stderr}${data.toString()}`;
    });

    childProcess.on("error", (error: string): void => {
      childProcess.kill();

      if (typeof spinnerMessage === "string") {
        stopSpinner(color.red("failed"));
      }

      rej(new Error(`${printOutput ? "" : stderr}${error}\n${debugInfo}`));
    });

    childProcess.on("close", (code): void => {
      childProcess.kill();

      if (typeof spinnerMessage === "string") {
        stopSpinner(code === 0 ? "done" : color.red("failed"));
      }

      if (execTimeout !== false) {
        clearTimeout(execTimeout);
      }

      if (stderr.includes("linker `cc` not found")) {
        rej(
          new CLIError(
            `\n${color.yellow(MARINE_CARGO_DEPENDENCY)} requires ${color.yellow(
              "build-essential"
            )} to be installed. Please install it and try again.\nOn debian-based systems (e.g. Ubuntu) you can install it using this command:\n\n${color.yellow(
              "sudo apt install build-essential"
            )}\n`
          )
        );

        return;
      }

      if (code !== 0) {
        rej(
          new Error(
            `${printOutput ? "" : stderr}\nprocess exited${
              code === null ? "" : ` with code ${code}`
            }\n${debugInfo}`
          )
        );

        return;
      }

      res(stdout);
    });
  });
};
