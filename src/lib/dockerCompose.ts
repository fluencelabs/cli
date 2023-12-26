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

import { TMP_DOCKER_COMPOSE_PATH } from "./const.js";
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
    args: useDockerComposeV2
      ? [
          "compose",
          "-f",
          TMP_DOCKER_COMPOSE_PATH,
          "-f",
          "./docker-compose.yaml",
          ...args.args,
        ]
      : args.args,
  });
}
