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

import { AssertionError } from "node:assert";

export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

export type Flags<T extends string> = Record<
  T,
  string | number | boolean | Array<string | undefined>
>;

export type OptionalFlags<T extends string> = Partial<
  Record<T, string | number | boolean | undefined | Array<string | undefined>>
>;

export const isObject = (
  unknown: unknown
): unknown is Record<string, unknown> =>
  unknown !== null && typeof unknown === "object";

export const hasKey = <K extends string>(
  key: K,
  unknown: unknown
): unknown is Record<K, unknown> => isObject(unknown) && key in unknown;

/**
 * Asserts unknown value is an object that has the key
 * @example
 * const unknown: unknown = { a: 1 }
 * assertHasKey('a', unknown, 'unknown must have "a" key')
 * unknown // Record<'a', unknown>
 * @example
 * const unknown: unknown = { a: 1 }
 * assertHasKey('b', unknown, 'unknown must have "b" key')
 * // throws AssertionError({ message: 'unknown must have "b" key' })
 * @param key any string key
 * @param unknown any value
 * @param message error message
 * @returns void
 */
export function assertHasKey<K extends string>(
  key: K,
  unknown: unknown,
  message: string
): asserts unknown is Record<K, unknown> {
  if (hasKey(key, unknown)) {
    throw new AssertionError({ message });
  }
}

/**
 * Returns a type guard (https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
 * that you can use to find out if unknown is a string union
 * @example
 * const isABC = getIsStringUnion(['a', 'b', 'c'])
 *
 * if (isABC(unknown)) {
 *   unknown // 'a' | 'b' | 'c'
 * }
 * @param array ReadonlyArray\<T extends string\>
 * @returns (unknown: unknown) => unknown is Array\<T\>[number]
 */
export function getIsStringUnion<T extends string>(
  array: ReadonlyArray<T>
): (unknown: unknown) => unknown is Array<T>[number] {
  return (unknown: unknown): unknown is Array<T>[number] =>
    array.some((v): boolean => v === unknown);
}
