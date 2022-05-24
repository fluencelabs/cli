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
import platform from "platform";

// eslint-disable-next-line @typescript-eslint/require-await
const hook: Hook<"init"> = async function (options): Promise<void> {
  console.log(111, options);

  const { version } = platform;

  if (version === undefined) {
    throw new Error("Unknown platform");
  }

  const majorVersion = Number(version.split(".")[0]);

  if (majorVersion < 16) {
    throw new Error(
      `Fluence CLI requires node.js version >= "16.x"; Detected ${version}. Please update node.js to version 16 or higher.\nYou can use https://nvm.sh utility to update node.js version: "nvm install 17 && nvm use 17 && nvm alias default 17"`
    );
  }
};

export default hook;
