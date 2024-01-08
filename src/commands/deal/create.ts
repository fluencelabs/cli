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

import { color } from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG, PRIV_KEY_FLAG } from "../../lib/const.js";
import { dealCreate } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Create extends BaseCommand<typeof Create> {
  static override description =
    "Create your deal with the specified parameters";
  static override flags = {
    ...baseFlags,
    "app-cid": Flags.string({
      description: "CID of the application that will be deployed",
      required: true,
    }),
    "collateral-per-worker": Flags.string({
      description: "Collateral per worker",
      required: true,
    }),
    "min-workers": Flags.integer({
      description: "Required workers to activate the deal",
      required: true,
    }),
    "target-workers": Flags.integer({
      description: "Max workers in the deal",
      required: true,
    }),
    "max-workers-per-provider": Flags.integer({
      description: "Max workers per provider",
      required: true,
    }),
    "price-per-worker-epoch": Flags.string({
      description: "Price per worker epoch",
      required: true,
    }),
    effector: Flags.string({
      description: "Effector to be used in the deal",
      multiple: true,
      required: true,
    }),
    ...ENV_FLAG,
    ...PRIV_KEY_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Create));

    const dealAddress = await dealCreate({
      appCID: flags["app-cid"],
      minWorkers: flags["min-workers"],
      targetWorkers: flags["target-workers"],
      maxWorkersPerProvider: flags["max-workers-per-provider"],
      pricePerWorkerEpoch: Number(flags["price-per-worker-epoch"]),
      effectors: flags.effector,
      privKey: flags["priv-key"],
    });

    commandObj.logToStderr(
      `Deal contract created: ${color.yellow(dealAddress)}`,
    );
  }
}
