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

import getRandomValues from "get-random-values";

import type { ConfigKeyPair } from "../configs/keyPair.js";

const genSecretKey = () => {
  return getRandomValues(new Uint8Array(32));
};

const uint8ArrayToBase64 = (array: Uint8Array) => {
  return Buffer.from(array).toString("base64");
};

export const generateKeyPair = (name: string): ConfigKeyPair => {
  return {
    secretKey: uint8ArrayToBase64(genSecretKey()),
    name,
  };
};

export const base64ToUint8Array = (base64: string) => {
  return new Uint8Array(Buffer.from(base64, "base64"));
};
