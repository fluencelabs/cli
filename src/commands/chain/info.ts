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
import { LOCAL_NET_DEFAULT_ACCOUNTS } from "../../lib/accounts.js";
import { getChainId } from "../../lib/chain/chainId.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { ensureChainEnv } from "../../lib/ensureChainNetwork.js";
import { jsonStringify } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Info extends BaseCommand<typeof Info> {
  static override description =
    "Show contract addresses for the fluence environment and accounts for the local environment";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Info));
    const chainEnv = await ensureChainEnv();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { default: contracts }: { default: unknown } = await import(
      `@fluencelabs/deal-ts-clients/dist/deployments/${chainEnv}.json`,
      {
        assert: { type: "json" },
      }
    );

    commandObj.log(
      jsonStringify({
        chainId: await getChainId(),
        contracts,
        defaultAccountsForLocalEnv: LOCAL_NET_DEFAULT_ACCOUNTS,
      }),
    );
  }
}
