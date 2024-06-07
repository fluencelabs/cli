/**
 * Copyright 2024 Fluence DAO
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

import { jsonStringify } from "@repo/common";

/**
 * Makes all properties in the object to be NOT readonly
 * Doesn't work recursively
 *
 * @example
 * const readonlyObject: Readonly<{a: number}> = { a: 1 };
 * const mutableObject: Mutable<typeof readonlyObject> = readonlyObject;
 * mutableObject.a = 2;
 */
export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

/**
 * Makes particular object properties to be required
 *
 * @example
 * const object: { a?: number, b?: string, c?: boolean } = {};
 * const requiredObject: WithRequired<typeof object, "a" | "b"> = { a: 1, b: "b" };
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Required<T> = WithRequired<T, keyof T>;

export type Flags<T extends string> = Record<
  T,
  string | number | boolean | Array<string | undefined>
>;

export type OptionalFlags<T extends string> = Partial<
  Record<T, string | number | boolean | undefined | Array<string | undefined>>
>;

export const isObject = (
  unknown: unknown,
): unknown is Record<string, unknown> => {
  return unknown !== null && typeof unknown === "object";
};

export const hasKey = <K extends string>(
  key: K,
  unknown: unknown,
): unknown is Record<K, unknown> => {
  return isObject(unknown) && key in unknown;
};

/**
 * Asserts unknown value is an object that has the key
 * @example
 * const unknown: unknown = { a: 1 }
 * assertHasKey('a', unknown, 'unknown must have "a" key')
 * unknown // Record<'a', unknown>
 * @example
 * const unknown: unknown = { a: 1 }
 * assertHasKey('b', unknown, 'unknown must have "b" key')
 * // throws Error('unknown must have "b" key')
 * @param key any string key
 * @param unknown any value
 * @param message error message
 * @returns void
 */
export function assertHasKey<K extends string>(
  key: K,
  unknown: unknown,
  message?: string,
): asserts unknown is Record<K, unknown> {
  if (!hasKey(key, unknown)) {
    throw new Error(
      message ?? `missing key '${key}' in ${jsonStringify(unknown)}`,
    );
  }
}
