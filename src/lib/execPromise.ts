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

import { exec } from "node:child_process";

import color from "@oclif/color";
import { CliUx } from "@oclif/core";

import { IS_DEVELOPMENT, TIMEOUT_FLAG_NAME } from "./const";

export const execPromise = (
  command: string,
  message?: string,
  timeout?: number
): Promise<string> => {
  if (typeof message === "string") {
    CliUx.ux.action.start(`${message}\n`);
  }

  return new Promise<string>((res, rej): void => {
    const commandToDisplay = IS_DEVELOPMENT
      ? command
      : command.replace(
          /([\S\s]*--sk ').*('[\S\s]*)/,
          "$1<SECRET_KEY_IS_HIDDEN>$2"
        );

    const failedCommandText = `Debug info:\n${commandToDisplay}\n`;

    const execTimeout =
      timeout !== undefined &&
      setTimeout((): void => {
        if (typeof message === "string") {
          CliUx.ux.action.stop(color.red("Timed out"));
        }
        childProcess.kill();
        rej(
          new Error(
            `Execution timed out: command didn't yield any result in ${color.yellow(
              `${timeout}ms`
            )}\nIt's best to just try again or increase timeout using ${color.yellow(
              `--${TIMEOUT_FLAG_NAME}`
            )} flag\n${failedCommandText}`
          )
        );
      }, timeout);

    const childProcess = exec(command, (error, stdout, stderr): void => {
      if (execTimeout !== false) {
        clearTimeout(execTimeout);
      }

      if (error !== null) {
        if (typeof message === "string") {
          CliUx.ux.action.stop(color.red("Failed"));
        }
        rej(
          new Error(
            `Command execution failed:\n\n${stderr}\n\n${failedCommandText}\n`
          )
        );
        return;
      }

      if (typeof message === "string") {
        CliUx.ux.action.stop();
      }

      if (stdout !== "") {
        res(stdout);
        return;
      }

      res(stderr);
    });
  });
};
