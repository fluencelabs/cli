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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  initNewReadonlyProviderConfig,
  type Offer,
  type ProviderConfigReadonly,
} from "../../lib/configs/project/provider.js";
import {
  OFFER_FLAG,
  PRIV_KEY_FLAG,
  NOXES_FLAG,
  PROVIDER_CONFIG_FLAGS,
  CURRENCY,
} from "../../lib/const.js";
import { dbg } from "../../lib/dbg.js";
import { initCli } from "../../lib/lifeCycle.js";
import { list, type Choices } from "../../lib/prompt.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

export default class Register extends BaseCommand<typeof Register> {
  static override description = "Register in matching contract";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
    ...NOXES_FLAG,
    ...OFFER_FLAG,
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Register),
    );

    const providerConfig = await initNewReadonlyProviderConfig(flags);

    let offer =
      flags.offer === undefined
        ? undefined
        : providerConfig.offers[flags.offer];

    if (offer === undefined) {
      if (flags.offer !== undefined) {
        commandObj.warn(`Offer ${color.yellow(flags.offer)} not found`);
      }

      offer = await promptForOffer(providerConfig.offers);
    }

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);
    const signer = await getSigner(network, flags["priv-key"]);
    const { DealClient } = await import("@fluencelabs/deal-aurora");
    // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
    const dealClient = new DealClient(network, signer);
    const globalContracts = dealClient.getGlobalContracts();
    const matcher = await globalContracts.getMatcher();
    const flt = await globalContracts.getFLT();

    const minPricePerWorkerEpochBigInt = BigInt(
      offer.minPricePerWorkerEpoch * CURRENCY,
    );

    dbg(`minPricePerWorkerEpoch: ${minPricePerWorkerEpochBigInt}`);

    const maxCollateralPerWorkerBigInt = BigInt(
      offer.maxCollateralPerWorker * CURRENCY,
    );

    dbg(`maxCollateralPerWorker: ${maxCollateralPerWorkerBigInt}`);

    const tx = await matcher.registerComputeProvider(
      minPricePerWorkerEpochBigInt,
      maxCollateralPerWorkerBigInt,
      await flt.getAddress(),
      [],
    );

    promptConfirmTx(flags["priv-key"]);
    // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
    await waitTx(tx);

    commandObj.log(color.green(`Successfully joined to matching contract`));
  }
}

function promptForOffer(offers: ProviderConfigReadonly["offers"]) {
  const options: Choices<Offer> = Object.entries(offers).map(
    ([name, offer]) => {
      return {
        name,
        value: offer,
      };
    },
  );

  return list({
    message: "Select offer",
    options,
    oneChoiceMessage(choice) {
      return `Select offer ${color.yellow(choice)}`;
    },
    onNoChoices() {
      commandObj.error("No offers found");
    },
  });
}
