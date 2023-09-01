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

import { kras, stage, testNet } from "@fluencelabs/fluence-network-environment";
import { color } from "@oclif/color";

import type Peers from "../../commands/default/peers.js";
import { commandObj } from "../../lib/commandObj.js";
import { NETWORKS, isNetwork, type Network } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { list } from "../../lib/prompt.js";

export async function peersImpl(
  this: Peers,
  command: typeof Peers,
): Promise<void> {
  const {
    args: { NETWORK },
  } = await initCli(this, await this.parse(command));

  if (NETWORK === undefined) {
    return printPeerAddresses("kras");
  }

  if (isNetwork(NETWORK)) {
    return printPeerAddresses(NETWORK);
  }

  commandObj.warn(`Invalid network: ${color.yellow(NETWORK)}`);

  const network = await list({
    message: "Select network",
    options: [...NETWORKS],
    oneChoiceMessage: () => {
      throw new Error("Unreachable");
    },
    onNoChoices() {
      throw new Error("Unreachable");
    },
  });

  printPeerAddresses(network);
}

const printPeerAddresses = (network: Network) => {
  return commandObj.log(
    `${color.yellow(network)} multiaddresses:\n\n${{
      kras,
      stage,
      testnet: testNet,
    }[network]
      .map(({ multiaddr }) => {
        return multiaddr;
      })
      .join("\n")}`,
  );
};
