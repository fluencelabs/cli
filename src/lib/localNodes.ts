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

import type { Node } from "@fluencelabs/fluence-network-environment";

import { getPeerId } from "./multiaddres.js";

export const localMultiaddrs: string[] = [
  "/ip4/127.0.0.1/tcp/9991/ws/p2p/12D3KooWBM3SdXWqGaawQDGQ6JprtwswEg3FWGvGhmgmMez1vRbR",
  "/ip4/127.0.0.1/tcp/9992/ws/p2p/12D3KooWQdpukY3p2DhDfUfDgphAqsGu5ZUrmQ4mcHSGrRag6gQK",
  "/ip4/127.0.0.1/tcp/9993/ws/p2p/12D3KooWRT8V5awYdEZm6aAV9HWweCEbhWd7df4wehqHZXAB7yMZ",
  "/ip4/127.0.0.1/tcp/9994/ws/p2p/12D3KooWBzLSu9RL7wLP6oUowzCbkCj2AGBSXkHSJKuq4wwTfwof",
  "/ip4/127.0.0.1/tcp/9995/ws/p2p/12D3KooWBf6hFgrnXwHkBnwPGMysP3b1NJe5HGtAWPYfwmQ2MBiU",
  "/ip4/127.0.0.1/tcp/9996/ws/p2p/12D3KooWPisGn7JhooWhggndz25WM7vQ2JmA121EV8jUDQ5xMovJ",
];

export const local: Node[] = localMultiaddrs.map((multiaddr) => ({
  peerId: getPeerId(multiaddr),
  multiaddr,
}));
