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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { NETWORKS } from "../../lib/const.js";

export default class Peers extends BaseCommand<typeof Peers> {
  static override description = "Print default Fluence network peer addresses";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    NETWORK: Args.string({
      description: `Network to use. One of ${NETWORKS.join(", ")}`,
    }),
  };
  async run(): Promise<void> {
    const { peersImpl } = await import("../../commands-impl/default/peers.js");
    await peersImpl.bind(this)(Peers);
  }
}
