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

import assert from "node:assert";

import {
  krasnodar,
  stage,
  testNet,
  type Node,
} from "@fluencelabs/fluence-network-environment";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Multiaddr } from "multiaddr";

import { commandObj } from "./commandObj.js";
import { getIsStringUnion } from "./typeHelpers.js";

export const NETWORKS = ["kras", "stage", "testnet"] as const;
export type Network = (typeof NETWORKS)[number];
export const isNetwork = getIsStringUnion(NETWORKS);
export type FluenceEnv = Network | "local";
export type Relays = Network | Array<string> | undefined;

const ADDR_MAP: Record<Network, Array<Node>> = {
  kras: krasnodar,
  stage,
  testnet: testNet,
};

const resolveAddrs = (
  maybeRelays: Relays | null | undefined
): Array<string> => {
  if (maybeRelays === undefined || maybeRelays === null) {
    return ADDR_MAP.kras.map((node) => {
      return node.multiaddr;
    });
  }

  const relays = maybeRelays;

  if (Array.isArray(relays)) {
    return relays.map((relay) => {
      return resolveRelay(relay);
    });
  }

  return ADDR_MAP[relays].map((node) => {
    return node.multiaddr;
  });
};

const getRandomArrayItem = <T>(ar: Array<T>): T => {
  const randomIndex = Math.round(Math.random() * (ar.length - 1));
  const randomItem = ar[randomIndex];
  assert(randomItem !== undefined);
  return randomItem;
};

/**
 * @param maybeRelayName - name of the relay in format `networkName-index`
 * @returns undefined if name is not in format `networkName-index` or Node if it is
 */
const getMaybeNamedNode = (
  maybeRelayName: string | undefined
): undefined | Node => {
  if (maybeRelayName === undefined) {
    return undefined;
  }

  const maybeNetworkName = NETWORKS.find((networkName) => {
    return maybeRelayName.startsWith(networkName);
  });

  // if ID doesn't start with network name - return undefined
  if (maybeNetworkName === undefined) {
    return undefined;
  }

  const networkName = maybeNetworkName;
  const [, indexString] = maybeRelayName.split("-");
  const parseResult = parseNamedPeer(indexString, networkName);

  if (typeof parseResult === "string") {
    commandObj.error(
      `Can't parse address ${color.yellow(maybeRelayName)}: ${parseResult}`
    );
  }

  return ADDR_MAP[networkName][parseResult];
};

const parseNamedPeer = (
  indexString: string | undefined,
  networkName: Network
): number | string => {
  if (indexString === undefined) {
    return `You must specify peer index after dash (e.g. ${color.yellow(
      `${networkName}-0`
    )})`;
  }

  const index = Number(indexString);

  if (isNaN(index)) {
    return `Index ${color.yellow(indexString)} is not a number`;
  }

  if (index < 0 || index >= ADDR_MAP[networkName].length) {
    return `Index ${index} is out of range`;
  }

  return index;
};

export const resolveRelay = (
  maybeRelay: string | undefined,
  maybeRelays?: Relays | null | undefined
) => {
  return (
    getMaybeNamedNode(maybeRelay)?.multiaddr ??
    maybeRelay ??
    getRandomRelayAddr(maybeRelays)
  );
};

export const resolvePeerId = (peerId: string) => {
  return getMaybeNamedNode(peerId)?.peerId ?? peerId;
};

export const getRandomRelayAddr = (
  maybeRelays: Relays | null | undefined
): string => {
  return getRandomArrayItem(resolveAddrs(maybeRelays));
};

export const getPeerId = (addr: string): string => {
  const id = new Multiaddr(addr).getPeerId();

  if (id === null) {
    return commandObj.error(
      `Can't extract peer id from multiaddr ${color.yellow(addr)}`
    );
  }

  return id;
};

const getIds = (nodes: Array<string>): Array<string> => {
  return nodes.map((addr): string => {
    return getPeerId(addr);
  });
};

export const getRandomPeerId = (relays: Relays): string => {
  return getPeerId(getRandomRelayAddr(relays));
};

export const getEvenlyDistributedIds = (
  relays: Relays,
  count = 1
): Array<string> => {
  const addrs = resolveAddrs(relays);
  const ids = getIds(addrs);
  return getEvenlyDistributedIdsFromTheList(ids, count);
};

const offsets = new Map<string, number>();

/**
 *
 * @param ids List of ids from which a new list with the same ids is created
 * @param count Amount of the ids to return
 * @returns evenly distributed list of ids
 *
 * ALERT! This function is not pure because it uses `offsets` map to store
 * offsets for each unique collection of ids. Each time the function is executed
 * - offset changes by the `count` number but it never becomes larger then
 * `ids.length`. It's implemented this way because it allows to have even
 * distribution of ids across different deploys of different services
 */
export const getEvenlyDistributedIdsFromTheList = (
  ids: Array<string>,
  count = ids.length
): Array<string> => {
  const result: Array<string> = [];
  const sortedIds = [...ids].sort();
  const key = JSON.stringify(sortedIds);
  let offset = offsets.get(key) ?? 0;

  for (let i = 0; i < count; i = i + 1) {
    const id = ids[(i + offset) % ids.length];
    assert(typeof id === "string");
    result.push(id);
  }

  offset = (offset + count) % ids.length;
  offsets.set(key, offset);

  return result;
};
