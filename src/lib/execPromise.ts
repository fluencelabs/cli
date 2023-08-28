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
import { join } from "path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { CLIError } from "@oclif/core/lib/errors/index.js";

import { isInteractive } from "./commandObj.js";
import { CLI_NAME, MARINE_CARGO_DEPENDENCY } from "./const.js";
import { dbg } from "./debug.js";
import { type Flags, flagsToArgs } from "./helpers/flagsToArgs.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";

const PATH_TO_RUN_JS = join(CLI_NAME, "bin", "run.js");

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
  args = [],
  flags = {},
  options,
  spinnerMessage,
  timeout,
  printOutput: printOutputArg = false,
}: ExecPromiseArg): Promise<string> => {
  const printOutput = isInteractive ? printOutputArg : false;
  const allArgs = [...args, ...flagsToArgs(flags)];
  const fullCommand = [command, ...allArgs].join(" ");

  const isRunningCLITest = fullCommand.includes(PATH_TO_RUN_JS);

  dbg(
    isRunningCLITest
      ? `${CLI_NAME}${fullCommand.split(PATH_TO_RUN_JS)[1]}`
      : fullCommand,
  );

  const getCommandFailedMessage = (code: number | null = null) => {
    const exitCodeMessage =
      code === null ? "failed" : `exited with code ${code}`;

    return `Command: ${color.yellow(fullCommand)} ${exitCodeMessage}`;
  };

  if (typeof spinnerMessage === "string") {
    startSpinner(spinnerMessage);
  }

  const result = await new Promise<CLIError | Error | string>((res): void => {
    const execTimeout =
      timeout !== undefined &&
      setTimeout((): void => {
        if (typeof spinnerMessage === "string") {
          stopSpinner(color.red("Timed out"));
        }

        childProcess.kill();
        const commandFailedMessage = getCommandFailedMessage();

        res(
          new Error(
            `${commandFailedMessage}. Reason: Execution timed out: command didn't yield any result in ${color.yellow(
              `${timeout}ms`,
            )}`,
          ),
        );
      }, timeout);

    const childProcess = spawn(command, allArgs, options ?? {});

    let stdout = "";

    childProcess.stdout?.on("data", (data: Buffer): void => {
      if (isRunningCLITest) {
        process.stderr.write(data);
      }

      if (printOutput) {
        process.stdout.write(data);
      }

      stdout = `${stdout}${data.toString()}`;
    });

    let stderr = "";

    childProcess.stderr?.on("data", (data: Buffer): void => {
      if (isRunningCLITest) {
        process.stderr.write(data);
      }

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
      res(new Error(`${commandFailedMessage}${errorMessage}${error}`));
    });

    childProcess.on("close", (code): void => {
      childProcess.kill();

      if (typeof spinnerMessage === "string") {
        stopSpinner(code === 0 ? "done" : color.red("failed"));
      }

      if (execTimeout !== false) {
        clearTimeout(execTimeout);
      }

      if (
        stderr.includes("linker `cc` not found") ||
        stderr.includes("linking with `cc` failed")
      ) {
        const expectedErrorMessage = `\n${color.yellow(
          MARINE_CARGO_DEPENDENCY,
        )} requires ${color.yellow(
          "build-essential",
        )} to be installed. Please install it and try again.\nOn debian-based systems (e.g. Ubuntu) you can install it using this command:\n\n${color.yellow(
          "sudo apt install build-essential",
        )}\n`;

        res(new CLIError(expectedErrorMessage));
        return;
      }

      if (code !== 0) {
        const commandFailedMessage = getCommandFailedMessage(code);
        const errorMessage = getErrorMessage(printOutput, stderr);
        res(new Error(`${commandFailedMessage}${errorMessage}`));
      }

      res(stdout);
    });
  });

  if (result instanceof Error) {
    throw result;
  }

  return result;
};
