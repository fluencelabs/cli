/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { color } from "@oclif/color";

import { jsonStringify } from "../../common.js";
import type {
  get_logs,
  get_logs_deal,
} from "../compiled-aqua/installation-spell/cli.js";

import { LOGS_GET_ERROR_START } from "./utils.js";

type FormatAquaLogsType =
  | Awaited<ReturnType<typeof get_logs>>[number]
  | ({ worker_name: string | undefined } & Awaited<
      ReturnType<typeof get_logs_deal>
    >[number]["logs"][number]);

export function formatAquaLogsHeader({
  worker_name,
  ...rest
}: { worker_name: string | undefined } & Record<
  string,
  string | null | undefined
>) {
  const formattedWorkerName =
    worker_name === undefined ? "" : `${color.yellow(worker_name)} `;

  const formattedHeader = Object.entries(rest)
    .map(([key, value]) => {
      return `${key}: ${value ?? "unknown"}`;
    })
    .join(", ");

  return `${formattedWorkerName}(${formattedHeader}): `;
}

export function formatAquaLogs({
  logs,
  error,
  host_id,
  spell_id,
  worker_id,
  worker_name,
}: FormatAquaLogsType): string {
  const header = formatAquaLogsHeader({
    worker_name,
    host_id,
    worker_id,
    spell_id,
  });

  if (typeof error === "string") {
    const trimmedError = error.trim();
    return `${header}${color.red(
      trimmedError === ""
        ? `${LOGS_GET_ERROR_START}Unknown error when getting logs`
        : trimmedError,
    )}`;
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
  let parsedMessage;

  try {
    parsedMessage = JSON.parse(message);
  } catch {
    return message;
  }

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
