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

import { URL } from "node:url";
/* eslint-disable no-restricted-syntax */

export function numToStr(num: number): string {
  return num.toString();
}

export function bigintToStr(num: bigint): string {
  return num.toString();
}

export function boolToStr(bool: boolean): string {
  return bool ? "true" : "false";
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function bufferToStr(buffer: Buffer): string {
  return buffer.toString();
}

export function urlToStr(url: URL) {
  return url.toString();
}

export function nullableToString(value: null | undefined): string {
  return value === null ? "null" : "undefined";
}
