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

import { KeyPair } from "@fluencelabs/fluence";
import type { JSONSchemaType } from "ajv";

export type ConfigKeyPair = {
  peerId: string;
  secretKey: string;
  publicKey: string;
  name: string;
};

export const configKeyPairSchema: JSONSchemaType<ConfigKeyPair> = {
  type: "object",
  properties: {
    peerId: { type: "string" },
    secretKey: { type: "string" },
    publicKey: { type: "string" },
    name: { type: "string" },
  },
  required: ["peerId", "secretKey", "publicKey", "name"],
};

export const generateKeyPair = async (name: string): Promise<ConfigKeyPair> => {
  const keyPair = await KeyPair.randomEd25519();
  return {
    peerId: keyPair.Libp2pPeerId.toB58String(),
    secretKey: Buffer.from(keyPair.toEd25519PrivateKey()).toString("base64"),
    publicKey: Buffer.from(keyPair.Libp2pPeerId.pubKey.bytes).toString(
      "base64"
    ),
    name,
  };
};
