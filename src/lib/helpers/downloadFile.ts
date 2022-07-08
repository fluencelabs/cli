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

import fsPromises from "node:fs/promises";

import { CliUx } from "@oclif/core";
import fetch from "node-fetch";

export const downloadFile = async (
  path: string,
  url: string
): Promise<string> => {
  CliUx.ux.action.start(`Downloading ${url} to ${path}`);
  const res = await fetch(url);
  const buffer = await res.buffer();
  await fsPromises.writeFile(path, buffer);
  CliUx.ux.action.stop();
  return path;
};
