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

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { commandObj } from "../lib/commandObj.js";
import { initCli } from "../lib/lifeCycle.js";
import { createTransactions } from "../lib/server.js";

export default class UI extends BaseCommand<typeof UI> {
  static override description = "ui";
  static override flags = {
    ...baseFlags,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(UI));

    const { step1, step2, step3 } = createTransactions({
      name: "Deploying deal",
      steps: {
        step1: {
          name: "Sign transaction 1",
          dataForEthersJs: "some data 1",
        },
        step2: {
          name: "Sign transaction 2",
          dataForEthersJs: "some data 2",
        },
        step3: {
          name: "Sign transaction 3",
          dataForEthersJs: "some data 3",
        },
      },
    });

    const res1 = await step1();
    commandObj.log(res1);
    const res2 = await step2();
    commandObj.log(res2);
    const res3 = await step3();
    commandObj.log(res3);
  }
}
