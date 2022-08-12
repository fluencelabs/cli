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

import assert from "node:assert";

import {
  krasnodar,
  stage,
  testNet,
  Node,
} from "@fluencelabs/fluence-network-environment";
import { Multiaddr } from "multiaddr";

export const NETWORKS = ["kras", "stage", "testnet"] as const;
export type Network = typeof NETWORKS[number];
export type Relays = Network | Array<string> | undefined;

const getAddrs = (nodes: Array<Node>): Array<string> =>
  nodes.map(({ multiaddr }): string => multiaddr);

const ADDR_MAP: Record<Network, Array<string>> = {
  kras: getAddrs(krasnodar),
  stage: getAddrs(stage),
  testnet: getAddrs(testNet),
};

const resolveAddrs = (relays: Relays): Array<string> => {
  if (relays === undefined) {
    return ADDR_MAP.kras;
  }

  if (Array.isArray(relays)) {
    return relays;
  }

  return ADDR_MAP[relays];
};

export const getRandomRelayAddr = (relays: Relays): string => {
  const addrs = resolveAddrs(relays);
  const largestIndex = addrs.length - 1;
  const randomIndex = Math.round(Math.random() * largestIndex);

  const randomRelayAddr = addrs[randomIndex];
  assert(randomRelayAddr !== undefined);
  return randomRelayAddr;
};

const getIds = (nodes: Array<string>): Array<string> =>
  nodes.map((addr): string => {
    const id = new Multiaddr(addr).getPeerId();
    assert(id !== null);
    return id;
  });

export const getRandomRelayId = (relays: Relays): string => {
  const addrs = resolveAddrs(relays);
  const ids = getIds(addrs);
  return getRandomRelayIdFromTheList(ids);
};

export const getRandomRelayIdFromTheList = (ids: Array<string>): string => {
  const largestIndex = ids.length - 1;
  const randomIndex = Math.round(Math.random() * largestIndex);

  const randomRelayId = ids[randomIndex];
  assert(randomRelayId !== undefined);

  return randomRelayId;
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

export const getEvenlyDistributedIdsFromTheList = (
  ids: Array<string>,
  count = ids.length
): Array<string> => {
  const result: Array<string> = [];
  const sortedIds = ids.sort();
  const key = JSON.stringify(sortedIds);
  let offset = offsets.get(key) ?? 0;

  for (let i = 0; i < count; i = i + 1) {
    const id = sortedIds[(i + offset) % sortedIds.length];
    assert(typeof id === "string");
    result.push(id);
  }

  offset = (offset + count) % sortedIds.length;
  offsets.set(key, offset);

  return result;
};
