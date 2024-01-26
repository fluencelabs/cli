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
import {
  depositCollateral,
  depositCollateralByNoxNames,
} from "../../lib/chain/depositCollateral.js";
import { PRIV_KEY_FLAG, ENV_FLAG } from "../../lib/const.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class AddCollateral extends BaseCommand<typeof AddCollateral> {
  static override description = "Add collateral to capacity commitment";
  static override aliases = ["provider:ac"];
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
    "nox-names": Flags.string({
      description:
        "Comma-separated names of noxes to add collateral for. Default: all noxes from capacityCommitments property of the provider config",
      exclusive: ["ids"],
    }),
    ids: Flags.string({
      description:
        "Comma separated capacity commitment IDs. Default: all noxes from capacityCommitments property of the provider config",
      exclusive: ["nox-names"],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(AddCollateral));

    if (flags.ids !== undefined) {
      await depositCollateral(commaSepStrToArr(flags.ids));
      return;
    }

    await depositCollateralByNoxNames(flags);
  }
}
