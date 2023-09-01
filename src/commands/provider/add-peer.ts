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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../lib/const.js";

export default class AddPeer extends BaseCommand<typeof AddPeer> {
  static override description =
    "Register specific nox instance as a Compute Peer";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
    "peer-id": Flags.string({
      description:
        "Peer id of the nox instance that you want to register as a Compute Peer",
      helpValue: "<peer-id>",
      multiple: true,
    }),
    slots: Flags.string({
      description: "Number of available worker slots on this Compute Peer",
      helpValue: "<number>",
    }),
  };

  async run(): Promise<void> {
    const { addPeerImpl } = await import(
      "../../commands-impl/provider/add-peer.js"
    );

    await addPeerImpl.bind(this)(AddPeer);
  }
}
