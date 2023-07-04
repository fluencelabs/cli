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
const color = oclifColor.default;
import { CLIError } from "@oclif/core/lib/errors/index.js";

import { isInteractive } from "./commandObj.js";
import { IS_DEVELOPMENT, MARINE_CARGO_DEPENDENCY } from "./const.js";
import { type Flags, flagsToArgs } from "./helpers/flagsToArgs.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";

type SpawnParams = Parameters<typeof spawn>;

const getErrorMessage = (printOutput: boolean, stderr: string) => {
  return printOutput ? "" : `. Reason:\n${stderr}`;
};

export type ExecPromiseArg = {
  command: SpawnParams[0];
  args?: SpawnParams[1] | undefined;
  flags?: Flags | undefined;
  options?: SpawnParams[2] | undefined;
  spinnerMessage?: string | undefined;
  timeout?: number | undefined;
  printOutput?: boolean | undefined;
};

export const execPromise = async ({
  command,
  args,
  flags,
  options,
  spinnerMessage,
  timeout,
  printOutput: printOutputArg = false,
}: ExecPromiseArg): Promise<string> => {
  const printOutput = isInteractive ? printOutputArg : false;
  const flagArgs = flags === undefined ? [] : flagsToArgs(flags);
  const allArgs = [...(args ?? []), ...flagArgs];
  const fullCommand = [command, ...allArgs].join(" ");

  const getCommandFailedMessage = (code: number | null = null) => {
    return `Command: ${color.yellow(
      IS_DEVELOPMENT
        ? fullCommand
        : fullCommand.replace(
            /([\S\s]*--sk ).*([\S\s]*)/,
            "$1<SECRET_KEY_IS_HIDDEN>$2"
          )
    )} ${code === null ? "failed" : `exited with code ${code}`}`;
  };

  if (typeof spinnerMessage === "string") {
    startSpinner(spinnerMessage);
  }

  const result = await new Promise<
    | { errorMessage: string }
    | { expectedErrorMessage: string }
    | { stdout: string }
  >((res): void => {
    const execTimeout =
      timeout !== undefined &&
      setTimeout((): void => {
        if (typeof spinnerMessage === "string") {
          stopSpinner(color.red("Timed out"));
        }

        childProcess.kill();
        const commandFailedMessage = getCommandFailedMessage();

        const errorMessage = `${commandFailedMessage}. Reason: Execution timed out: command didn't yield any result in ${color.yellow(
          `${timeout}ms`
        )}`;

        res({ errorMessage });
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

      const commandFailedMessage = getCommandFailedMessage();
      const errorMessage = getErrorMessage(printOutput, stderr);

      res({
        errorMessage: `${commandFailedMessage}${errorMessage}${error}`,
      });
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
        const expectedErrorMessage = `\n${color.yellow(
          MARINE_CARGO_DEPENDENCY
        )} requires ${color.yellow(
          "build-essential"
        )} to be installed. Please install it and try again.\nOn debian-based systems (e.g. Ubuntu) you can install it using this command:\n\n${color.yellow(
          "sudo apt install build-essential"
        )}\n`;

        res({ expectedErrorMessage });

        return;
      }

      if (code !== 0) {
        res({
          errorMessage: `${getCommandFailedMessage(code)}${getErrorMessage(
            printOutput,
            stderr
          )}`,
        });
      }

      res({ stdout });
    });
  });

  if ("expectedErrorMessage" in result) {
    throw new CLIError(result.expectedErrorMessage);
  }

  if ("errorMessage" in result) {
    throw new Error(result.errorMessage);
  }

  return result.stdout;
};
