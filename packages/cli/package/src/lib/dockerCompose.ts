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

import { execPromise, type ExecPromiseArg } from "./execPromise.js";

let useDockerComposeV2: boolean | undefined;

export async function dockerCompose(
  args: Omit<ExecPromiseArg, "command"> & { args: string[] },
) {
  if (useDockerComposeV2 === undefined) {
    try {
      await execPromise({
        command: "docker",
        args: ["compose", "version"],
      });

      useDockerComposeV2 = true;
    } catch {
      useDockerComposeV2 = false;
    }
  }

  return execPromise({
    command: useDockerComposeV2 ? "docker" : "docker-compose",
    ...args,
    args: useDockerComposeV2 ? ["compose", ...args.args] : args.args,
  });
}
