/**
 * Copyright 2024 Fluence DAO
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
import { printCommitmentsInfo } from "../../lib/chain/commitment.js";
import { CHAIN_FLAGS, CC_FLAGS } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CCInfo extends BaseCommand<typeof CCInfo> {
  static override aliases = ["provider:ci"];
  static override description = "Get info about capacity commitments";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...CC_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CCInfo));
    await printCommitmentsInfo(flags);
  }
}
