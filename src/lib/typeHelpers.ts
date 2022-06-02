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

import { AssertionError } from "node:assert";

export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

export const isObject = (
  unknown: unknown
): unknown is Record<string, unknown> =>
  unknown !== null && typeof unknown === "object";

export const hasKey = <K extends string>(
  key: K,
  unknown: unknown
): unknown is Record<K, unknown> => isObject(unknown) && key in unknown;

export const assertHasKey: <K extends string>(
  key: K,
  unknown: unknown,
  message: string
) => asserts unknown is Record<K, unknown> = <K extends string>(
  key: K,
  unknown: unknown,
  message: string
): asserts unknown is Record<K, unknown> => {
  if (hasKey(key, unknown)) {
    throw new AssertionError({ message });
  }
};
