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

import { krasnodar } from "@fluencelabs/fluence-network-environment";

export const defaultAddr = krasnodar.map(({ multiaddr }): string => multiaddr);
const defaultRelayIds = krasnodar.map(({ peerId }): string => peerId);

export const getRandomRelayAddr = (): string => {
  const largestIndex = defaultAddr.length - 1;
  const randomIndex = Math.round(Math.random() * largestIndex);

  const randomRelayAddr = defaultAddr[randomIndex];
  assert(randomRelayAddr !== undefined);
  return randomRelayAddr;
};

export const getRandomRelayId = (): string => {
  const largestIndex = defaultRelayIds.length - 1;
  const randomIndex = Math.round(Math.random() * largestIndex);

  const randomRelayId = defaultRelayIds[randomIndex];
  assert(randomRelayId !== undefined);

  return randomRelayId;
};
