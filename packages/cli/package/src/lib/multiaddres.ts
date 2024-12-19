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

import { type Node as AddrAndPeerId } from "@fluencelabs/fluence-network-environment";

import { ensureComputerPeerConfigs } from "./configs/project/provider/provider.js";
import { numToStr } from "./helpers/typesafeStringify.js";
import { resolveAddrsAndPeerIdsWithoutLocal } from "./multiaddresWithoutLocal.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

async function ensureLocalAddrsAndPeerIds() {
  return (await ensureComputerPeerConfigs()).map(
    ({ peerId, overriddenNoxConfig }): AddrAndPeerId => {
      return {
        multiaddr: `/ip4/127.0.0.1/tcp/${numToStr(overriddenNoxConfig.websocketPort)}/ws/p2p/${peerId}`,
        peerId,
      };
    },
  );
}

async function resolveDefaultAddrsAndPeerIds(): Promise<AddrAndPeerId[]> {
  const env = await ensureFluenceEnv();
  return env === "local"
    ? ensureLocalAddrsAndPeerIds()
    : resolveAddrsAndPeerIdsWithoutLocal(env);
}

export async function resolveDefaultRelays(): Promise<Array<string>> {
  return (await resolveDefaultAddrsAndPeerIds()).map((node) => {
    return node.multiaddr;
  });
}
