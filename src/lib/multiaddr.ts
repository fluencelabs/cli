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

import { krasnodar, testNet } from "@fluencelabs/fluence-network-environment";

const defaultEnvs = [...krasnodar, ...testNet];
export const defaultAddr = defaultEnvs.map(
  ({ multiaddr }): string => multiaddr
);
const defaultPeerIds = defaultEnvs.map(({ peerId }): string => peerId);

export const getRandomAddr = (knownRelays?: Array<string>): string => {
  const addresses = knownRelays ?? defaultAddr;
  const largestIndex = addresses.length - 1;
  const randomIndex = Math.round(Math.random() * largestIndex);

  const randomAddr = addresses[randomIndex];

  if (randomAddr === undefined) {
    throw new Error(
      "Error getting random addr: this error should be impossible"
    );
  }

  return randomAddr;
};

export const getRandomPeerId = (): string => {
  const largestIndex = defaultPeerIds.length - 1;
  const randomIndex = Math.round(Math.random() * largestIndex);

  const randomPeerId = defaultPeerIds[randomIndex];

  if (randomPeerId === undefined) {
    throw new Error(
      "Error getting random peer id: this error should be impossible"
    );
  }

  return randomPeerId;
};
