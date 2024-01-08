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
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG_NAME, PROVIDER_CONFIG_FLAGS } from "../../lib/const.js";
import { ensureChainNetwork } from "../../lib/ensureChainNetwork.js";
import { jsonStringify } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Info extends BaseCommand<typeof Info> {
  static override description = "Show contract addresses for the fluence env";
  static override flags = {
    ...baseFlags,
    ...PROVIDER_CONFIG_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Info));
    const env = await ensureChainNetwork(flags[ENV_FLAG_NAME]);

    const addresses: unknown = await import(
      `@fluencelabs/deal-ts-clients/dist/deployments/${env}.json`,
      {
        assert: { type: "json" },
      }
    );

    // @ts-expect-error each json module has default export
    commandObj.log(jsonStringify(addresses.default));
  }
}
