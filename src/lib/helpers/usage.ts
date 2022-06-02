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

import type { Command } from "@oclif/core";

import { hasKey } from "../typeHelpers";

export const usage = <T extends typeof Command>(CommandClass: T): string => {
  const command = CommandClass.name.toLowerCase();

  const args =
    CommandClass.args === undefined
      ? ""
      : CommandClass.args.reduce(
          (acc, { name }): string => `${acc} [${name}]`,
          ""
        );

  const flags =
    CommandClass.flags === undefined
      ? ""
      : Object.entries(CommandClass.flags).reduce(
          (acc, [fullKey, flag]): string => {
            const key = flag.char ?? fullKey;
            const prefix = flag.char === undefined ? "--" : "-";

            if (
              hasKey("helpValue", flag) &&
              typeof flag.helpValue === "string"
            ) {
              return `${acc} [${prefix}${key} ${flag.helpValue}]`;
            }

            return `${acc} [${prefix}${key}]`;
          },
          ""
        );

  return `${command}${args}${flags}`;
};
