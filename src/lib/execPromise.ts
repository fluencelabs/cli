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

import { CliUx } from "@oclif/core";
import { color } from "@oclif/color";

import { isDevelopment } from "./helpers/isDevelopment";

const EXECUTION_TIMEOUT = 90_000;

export const execPromise = (
  command: string,
  message: string,
  timeout?: number
): Promise<string> => {
  CliUx.ux.action.start(`${message}\n`);

  return new Promise<string>((res, rej): void => {
    const commandToDisplay = isDevelopment()
      ? command
      : command.replace(
          /([\S\s]*--sk ').*('[\S\s]*)/,
          "$1<SECRET_KEY_IS_HIDDEN>$2"
        );

    const failedCommandText = `${color.red(
      "\nFAILED EXECUTING COMMAND:"
    )}\n${commandToDisplay}\n`;

    const execTimeout = setTimeout((): void => {
      CliUx.ux.action.stop();
      rej(
        new Error(
          `${failedCommandText}Execution timed out: command didn't yield any result in ${EXECUTION_TIMEOUT}ms`
        )
      );
    }, timeout ?? EXECUTION_TIMEOUT);

    exec(command, (error, stdout, stderr): void => {
      clearTimeout(execTimeout);
      CliUx.ux.action.stop();

      if (error !== null) {
        rej(
          new Error(
            `\n${failedCommandText}\n\nCommand execution resulted in error:\n\n${stderr}`
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
