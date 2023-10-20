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

import type {
  get_logs,
  get_logs_deal,
} from "../compiled-aqua/installation-spell/cli.js";

import { LOGS_GET_ERROR_START, jsonStringify } from "./utils.js";

type FormatAquaLogsType =
  | Awaited<ReturnType<typeof get_logs>>[number]
  | ({ worker_name: string } & Awaited<
      ReturnType<typeof get_logs_deal>
    >[number]["logs"][number]);

export function formatAquaLogs({
  logs,
  error,
  host_id,
  spell_id,
  worker_id,
  worker_name,
}: FormatAquaLogsType): string {
  const formattedWorkerName =
    worker_name === "" ? "" : `${color.yellow(worker_name)} `;

  const formattedHeader = Object.entries({
    host_id,
    worker_id,
    spell_id,
  })
    .map(([key, value]) => {
      return `${key}: ${value}`;
    })
    .join(", ");

  const header = `${formattedWorkerName}(${formattedHeader}):`;

  if (typeof error === "string") {
    const trimmedError = error.trim();
    return `${header} ${LOGS_GET_ERROR_START}${
      trimmedError === "" ? "Unknown error" : trimmedError
    }`;
  }

  const formattedLogs = logs
    .map(({ message, timestamp }) => {
      const date = new Date(timestamp * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      return `${color.blue(date)} ${formatAquaLogsMessage(message)}`;
    })
    .join("\n");

  return `${header}\n\n${formattedLogs}`;
}

function formatAquaLogsMessage(message: string) {
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
