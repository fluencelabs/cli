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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { createCommitments } from "../../lib/chain/commitment.js";
import { NOX_NAMES_FLAG, CHAIN_FLAGS, OFFER_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CreateCommitment extends BaseCommand<
  typeof CreateCommitment
> {
  static override aliases = ["provider:cc"];
  static override description = "Create Capacity commitment";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...NOX_NAMES_FLAG,
    ...OFFER_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CreateCommitment));
    await createCommitments(flags);
  }
}
