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
import { CLIError } from "@oclif/core/lib/errors/index.js";

import type { ConfigKeyPair } from "../configs/keyPair.js";

export function commaSepStrToArr(commaSepStr: string) {
  return commaSepStr.split(",").map((s) => {
    return s.trim();
  });
}

function comment(commentToken: string) {
  return (text: string): string => {
    return text
      .split("\n")
      .map((line) => {
        return line === ""
          ? ""
          : line.replaceAll(/(^|\n)\s*/g, (spaces) => {
              return `${spaces}${commentToken} `;
            });
      })
      .join("\n");
  };
}

export const jsComment = comment("//");
export const aquaComment = comment("--");

export function jsonStringify(
  unknown: unknown,
  replacer: Parameters<typeof JSON.stringify>[1] = null,
): string {
  return JSON.stringify(unknown, replacer, 2);
}

export function stringifyUnknown(unknown: unknown): string {
  try {
    if (unknown instanceof CLIError) {
      return String(unknown);
    }

    if (unknown instanceof Error) {
      return jsonStringify(unknown, Object.getOwnPropertyNames(unknown));
    }

    if (unknown === undefined) {
      return "undefined";
    }

    return jsonStringify(unknown);
  } catch {
    return String(unknown);
  }
}

function flagToArg(
  flagName: string,
  flagValue: string | number | boolean | undefined,
): string[] {
  if (flagValue === undefined || flagValue === false) {
    return [];
  }

  const flag = `-${flagName.length > 1 ? "-" : ""}${flagName}`;

  if (flagValue === true) {
    return [flag];
  }

  return [flag, String(flagValue)];
}

export type Flags = Record<
  string,
  string | number | boolean | undefined | Array<string | undefined>
>;

export const flagsToArgs = (flags: Flags): string[] => {
  return Object.entries(flags)
    .map(([flagName, flagValue]): Array<string[]> => {
      return Array.isArray(flagValue)
        ? flagValue.map((value): string[] => {
            return flagToArg(flagName, value);
          })
        : [flagToArg(flagName, flagValue)];
    })
    .flat(2);
};

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

async function genSecretKey() {
  const getRandomValues = (await import("get-random-values")).default;
  return getRandomValues(new Uint8Array(32));
}

function uint8ArrayToBase64(array: Uint8Array) {
  return Buffer.from(array).toString("base64");
}

export async function genSecretKeyString(): Promise<string> {
  return uint8ArrayToBase64(await genSecretKey());
}

export async function genSecretKeyStringWithName(
  name: string,
): Promise<ConfigKeyPair> {
  return {
    secretKey: await genSecretKeyString(),
    name,
  };
}

export function base64ToUint8Array(base64: string) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

export function removeProperties<T>(
  obj: Record<string, T>,
  isPropertyToRemove: (arg: [key: string, value: unknown]) => boolean,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      return !isPropertyToRemove([key, value]);
    }),
  );
}
