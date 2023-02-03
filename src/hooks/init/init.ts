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

import type { Hook } from "@oclif/core";
import { version } from "platform";

const hook: Hook<"init"> = function (): Promise<void> {
  if (version === undefined) {
    return Promise.resolve(this.error("Unknown platform"));
  }

  const majorVersion = Number(version.split(".")[0]);

  if (majorVersion < 18) {
    return Promise.resolve(
      this.error(
        `Fluence CLI requires node.js version >= "18.x"; Detected ${version}. Please update node.js to version 18 or higher.\nYou can use https://nvm.sh utility to update node.js version: "nvm install 17 && nvm use 17 && nvm alias default 17"`
      )
    );
  }

  return Promise.resolve();
};

export default hook;
