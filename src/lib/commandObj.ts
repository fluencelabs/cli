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

import type { Command } from "@oclif/core";

export type CommandObj = InstanceType<typeof Command>;
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export let commandObj: CommandObj;
export let isInteractive: boolean;

export const setCommandObjAndIsInteractive = (
  newCommandObj: CommandObj,
  newIsInteractive: boolean,
): void => {
  commandObj = newCommandObj;
  isInteractive = newIsInteractive;
};
