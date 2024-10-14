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

import {
  type Node as AddrAndPeerId,
  stage,
  testNet,
  kras,
} from "@fluencelabs/fluence-network-environment";
import { multiaddr } from "@multiformats/multiaddr";
import { color } from "@oclif/color";

import { type PublicFluenceEnv } from "../common.js";

import { commandObj } from "./commandObj.js";
import { initEnvConfig } from "./configs/project/env.js";
import type { FluenceEnv } from "./const.js";

export function getPeerId(addr: string): string {
  const id = multiaddr(addr).getPeerId();

  if (id === null) {
    return commandObj.error(
      `Can't extract peer id from multiaddr ${color.yellow(addr)}`,
    );
  }

  return id;
}

export function addrsToNodes(multiaddrs: string[]): AddrAndPeerId[] {
  return multiaddrs.map((multiaddr) => {
    return {
      peerId: getPeerId(multiaddr),
      multiaddr,
    };
  });
}

const ADDR_MAP: Record<PublicFluenceEnv, Array<AddrAndPeerId>> = {
  mainnet: kras,
  testnet: testNet,
  stage,
};

let loggedAboutCustomAddrs = false;

export async function resolveAddrsAndPeerIdsWithoutLocal(
  env: Exclude<FluenceEnv, "local">,
): Promise<AddrAndPeerId[]> {
  const envConfig = await initEnvConfig();

  if (envConfig !== null && envConfig.relays !== undefined) {
    if (!loggedAboutCustomAddrs) {
      commandObj.log(
        `Using custom relays from ${color.yellow(envConfig.$getPath())}`,
      );

      loggedAboutCustomAddrs = true;
    }

    return addrsToNodes(envConfig.relays);
  }

  return ADDR_MAP[env];
}

export async function resolveRelaysWithoutLocal(
  env: Exclude<FluenceEnv, "local">,
): Promise<Array<string>> {
  return (await resolveAddrsAndPeerIdsWithoutLocal(env)).map((node) => {
    return node.multiaddr;
  });
}
