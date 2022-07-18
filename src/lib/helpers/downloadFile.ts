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

import color from "@oclif/color";
import camelcase from "camelcase";
import filenamify from "filenamify";
import fetch from "node-fetch";

export const downloadFile = async (
  path: string,
  url: string
): Promise<string> => {
  const res = await fetch(url);
  if (res.status === 404) {
    throw new Error(`Failed when downloading ${color.yellow(url)}`);
  }
  const buffer = await res.buffer();
  await fsPromises.writeFile(path, buffer);
  return path;
};

export const stringToServiceName = (string: string): string => {
  const cleanString = string.replace(".tar.gz?raw=true", "");
  return camelcase(
    filenamify(
      cleanString.split(cleanString.includes("/") ? "/" : "\\").slice(-1)[0] ??
        ""
    )
  );
};
