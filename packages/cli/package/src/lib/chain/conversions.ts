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

import type { CIDV1Struct } from "@fluencelabs/deal-ts-clients/dist/typechain-types/Config.js";

import { bufferToBase64 } from "../helpers/typesafeStringify.js";

const PREFIX = new Uint8Array([0, 36, 8, 1, 18, 32]);
const BASE_58_PREFIX = "z";

export async function peerIdBase58ToUint8Array(peerIdBase58: string) {
  const [{ digest }, { base58btc }] = await Promise.all([
    import("multiformats"),
    import("multiformats/bases/base58"),
  ]);

  return digest
    .decode(base58btc.decode(BASE_58_PREFIX + peerIdBase58))
    .bytes.subarray(PREFIX.length);
}

export async function peerIdBase58ToHexString(peerIdBase58: string) {
  const { hexlify } = await import("ethers");
  return hexlify(await peerIdBase58ToUint8Array(peerIdBase58));
}

export async function peerIdHexStringToBase58String(peerIdHex: string) {
  const [{ base58btc }] = await Promise.all([
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
  const { base32 } = await import("multiformats/bases/base32");
  return base32.encode(new Uint8Array(Buffer.from(cidHex, "hex")));
}

export function hexStringToBase64String(hexString: string): string {
  const cleanHexString = hexString.startsWith("0x")
    ? hexString.slice(2)
    : hexString;

  return bufferToBase64(Buffer.from(cleanHexString, "utf-8"));
}
