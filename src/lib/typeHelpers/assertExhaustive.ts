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

/**
 * Can be used in switch statements to guaranty they are exhaustive
 * @param _value never
 * @param message ?string
 *
 * @returns never
 */
export default function assertExhaustive(
  _value: never,
  message = "Reached unexpected case in exhaustive switch"
): never {
  throw new Error(message);
}
