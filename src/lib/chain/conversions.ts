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

import type { CIDV1Struct } from "@fluencelabs/deal-ts-clients/dist/typechain-types/Config.js";

const PREFIX = new Uint8Array([0, 36, 8, 1, 18, 32]);
const BASE_58_PREFIX = "z";

export async function peerIdToUint8Array(peerId: string) {
  const [{ digest }, { base58btc }] = await Promise.all([
    import("multiformats"),
    // eslint-disable-next-line import/extensions
    import("multiformats/bases/base58"),
  ]);

  return digest
    .decode(base58btc.decode(BASE_58_PREFIX + peerId))
    .bytes.subarray(PREFIX.length);
}

export async function peerIdHexStringToBase58String(peerIdHex: string) {
  const [{ base58btc }] = await Promise.all([
    // eslint-disable-next-line import/extensions
    import("multiformats/bases/base58"),
  ]);

  return base58btc
    .encode(Buffer.concat([PREFIX, Buffer.from(peerIdHex.slice(2), "hex")]))
    .slice(BASE_58_PREFIX.length);
}

const CID_PREFIX_LENGTH = 4;

export async function cidStringToCIDV1Struct(
  cidString: string,
): Promise<CIDV1Struct> {
  const { CID } = await import("ipfs-http-client");
  const id = CID.parse(cidString).bytes;

  return {
    prefixes: id.slice(0, CID_PREFIX_LENGTH),
    hash: id.slice(CID_PREFIX_LENGTH),
  };
}

export async function cidHexStringToBase32(cidHex: string): Promise<string> {
  // eslint-disable-next-line import/extensions
  const { base32 } = await import("multiformats/bases/base32");
  return base32.encode(new Uint8Array(Buffer.from(cidHex, "hex")));
}
