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

import { base64ToUint8Array } from "../keyPairs.js";

export async function getPeerIdFromSecretKey(secretKey: string) {
  const { generateKeyPairFromSeed } = await import("@libp2p/crypto/keys");
  const { createFromPrivKey } = await import("@libp2p/peer-id-factory");

  const key = await generateKeyPairFromSeed(
    "Ed25519",
    base64ToUint8Array(secretKey),
    256,
  );

  // eslint-disable-next-line no-restricted-syntax
  return (await createFromPrivKey(key)).toString();
}
