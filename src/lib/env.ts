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

import { commandObj } from "./commandObj.js";

const getPathEnvSeparator = () => {
  // It's unreliable to use commandObj in a global scope as it's value could be undefined when this file it resolved.
  return commandObj.config.windows ? ";" : ":";
};

export const findEntryInPATH = (entry: string): boolean => {
  return process.env.PATH.split(getPathEnvSeparator()).includes(entry);
};

export const prependEntryToPATH = (entry: string) => {
  process.env.PATH = `${entry}${getPathEnvSeparator()}${process.env.PATH}`;
};
