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

import { spawn } from "node:child_process";
import { join } from "path";

import { color } from "@oclif/color";
import { CLIError } from "@oclif/core/errors";

import { CLI_NAME, MARINE_CARGO_DEPENDENCY } from "./const.js";
import { dbg } from "./dbg.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { numToStr, bufferToStr } from "./helpers/typesafeStringify.js";
import { type Flags, flagsToArgs } from "./helpers/utils.js";

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
  printOutput = false,
}: ExecPromiseArg): Promise<string> => {
  const allArgs = [...args, ...flagsToArgs(flags)];
  const fullCommand = [command, ...allArgs].join(" ");

  const isRunningCLITest = fullCommand.includes(PATH_TO_RUN_JS);

  dbg(
    isRunningCLITest
      ? `${CLI_NAME}${(() => {
          const [, restCommand] = fullCommand.split(PATH_TO_RUN_JS);
          return restCommand ?? "";
        })()}`
      : fullCommand,
  );

  const getCommandFailedMessage = (code: number | null = null) => {
    const exitCodeMessage =
      code === null ? "failed" : `exited with code ${numToStr(code)}`;

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
              `${numToStr(timeout)}ms`,
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

      stdout = `${stdout}${bufferToStr(data)}`;
    });

    let stderr = "";

    childProcess.stderr?.on("data", (data: Buffer): void => {
      if (isRunningCLITest) {
        process.stderr.write(data);
      }

      if (printOutput) {
        process.stderr.write(data);
      }

      stderr = `${stderr}${bufferToStr(data)}`;
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
