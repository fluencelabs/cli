/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { BaseCommand } from "../../baseCommand.js";
import {
  filterOffersFoundOnChain, resolveSingleOfferFromProviderConfig
} from "../../lib/chain/offer/offer.js";
import { assertProviderIsRegistered } from "../../lib/chain/providerInfo.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  CLUSTER_ADDRESS_FLAG,
  SINGLE_OFFER_FLAG,
  ADDRESS_FLAG_NAME, SINGLE_OFFER_FLAG_NAME
} from "../../lib/const.js";
import { getContracts, sign } from "../../lib/dealClient.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm, input } from "../../lib/prompt.js";

export default class OfferAccessAddress extends BaseCommand<
  typeof OfferAccessAddress
> {
  static override hiddenAliases = ["provider:sck"];
  static override description = `Set access address for offer for use in cluster software.${aliasesText.apply(this)}`;
  static override flags = {
    ...SINGLE_OFFER_FLAG,
    ...CHAIN_FLAGS,
    ...CLUSTER_ADDRESS_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(OfferAccessAddress));
    const configOffer = await resolveSingleOfferFromProviderConfig(flags[SINGLE_OFFER_FLAG_NAME]);
    const offersFoundOnChain = await filterOffersFoundOnChain([configOffer]);
    const chainOffer = offersFoundOnChain[0];

    if (chainOffer === undefined) {
      commandObj.error(`Offer ${configOffer.offerName} is not found on chain`);
    }

    const address =
      flags[ADDRESS_FLAG_NAME] ??
      (await input({
        message: "Enter cluster address",
        validate(input: string) {
          return (
            input.length === 42 ||
            "Please enter an address (40 hex digits + 0x)"
          );
        },
      }));

    commandObj.logToStderr(
      `Setting cluster address ${address} for offer ${chainOffer.offerName} (${chainOffer.offerId})`
    )

    if (
      !(await confirm({
        message: "Would you like to continue",
        default: true,
      }))
    ) {
      commandObj.logToStderr("Setting cluster address cancelled");
      return;
    }

    const { contracts } = await getContracts();

    await sign({
      validateAddress: assertProviderIsRegistered,
      title: `Setting cluster address ${address} for offer ${chainOffer.offerName} (${chainOffer.offerId})`,
      method: contracts.diamond.setClusterKey,
      args: [chainOffer.offerId, address],
    });
  }
}
