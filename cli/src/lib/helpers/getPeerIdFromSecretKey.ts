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

import { base64ToUint8Array } from "../keyPairs.js";

export async function getPeerIdFromSecretKey(secretKey: string) {
  const { KeyPair } = await import("@fluencelabs/js-client");
  const keyPair = await KeyPair.fromEd25519SK(base64ToUint8Array(secretKey));
  return keyPair.getPeerId();
}
