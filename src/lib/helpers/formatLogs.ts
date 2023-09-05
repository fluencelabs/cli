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

import { color } from "@oclif/color";

import { jsonStringify } from "./jsonStringify.js";

type FormatAquaLogsArg = Array<{
  message: string;
  timestamp: number;
}>;

export function formatAquaLogs(aquaLogs: FormatAquaLogsArg): string {
  return aquaLogs
    .map(({ message, timestamp }) => {
      const date = new Date(timestamp * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      return `${color.blue(date)} ${formatMessage(message)}`;
    })
    .join("\n");
}

function formatMessage(message: string) {
  const parsedMessage = JSON.parse(message);

  if (Array.isArray(parsedMessage)) {
    return parsedMessage
      .map((messagePart) => {
        return typeof messagePart === "string"
          ? messagePart
          : jsonStringify(messagePart);
      })
      .join(" ");
  }

  if (typeof parsedMessage === "string") {
    return parsedMessage;
  }

  return jsonStringify(message);
}
