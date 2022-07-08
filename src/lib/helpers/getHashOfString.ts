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

import crypto from "node:crypto";

export const getHashOfString = (str: string): Promise<string> => {
  const md5Hash = crypto.createHash("md5");
  return new Promise((resolve): void => {
    md5Hash.on("readable", (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = md5Hash.read();
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        resolve(data.toString("hex"));
      }
    });

    md5Hash.write(str);
    md5Hash.end();
  });
};
