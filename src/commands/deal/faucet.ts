/**
 * Copyright 2022 Fluence Labs Limited
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

import type { DeveloperFaucet } from "@fluencelabs/deal-aurora";
import { Args, Flags } from "@oclif/core";
import { BigNumber } from "ethers";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import {
  CommandObj,
  isToken,
  NETWORK_FLAG,
  Token,
  TOKENS,
  TOKENS_STRING,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifecyle.js";
import { input, list } from "../../lib/prompt.js";
import {
  ensureChainNetwork,
  getDeveloperContract,
  getSigner,
} from "../../lib/provider.js";

const TOKEN_TO_METHOD_NAME_MAP: Record<
  Token,
  keyof Pick<DeveloperFaucet, "receiveFLT" | "receiveUSD">
> = {
  FakeUSD: "receiveUSD",
  FLT: "receiveFLT",
};

export default class Faucet extends BaseCommand<typeof Faucet> {
  static override description =
    "Dev faucet for receiving FLT and FakeUSD tokens";
  static override flags = {
    ...baseFlags,
    privKey: Flags.string({
      char: "k",
      description:
        "Private key with which transactions will be signed through cli",
      required: false,
    }),
    ...NETWORK_FLAG,
  };

  static override args = {
    amount: Args.string({
      description: "Amount of tokens to receive",
    }),
    token: Args.string({
      description: `Name of the token: ${TOKENS_STRING}`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags, commandObj, isInteractive } = await initCli(
      this,
      await this.parse(Faucet)
    );

    const amount =
      args.amount ??
      (await input({
        isInteractive,
        message: "Enter amount of tokens to receive",
      }));

    const amountBigNumber = BigNumber.from(amount).mul(
      BigNumber.from(10).pow(18)
    );

    const token = await resolveToken({
      commandObj,
      isInteractive,
      tokenFromArgs: args.token,
    });

    const network = await ensureChainNetwork({
      commandObj,
      isInteractive,
      maybeChainNetwork: flags.network,
    });

    const signer = await getSigner(network, flags.privKey, commandObj);
    const address = await signer.getAddress();
    const developerContract = getDeveloperContract(signer, network);
    const methodName = TOKEN_TO_METHOD_NAME_MAP[token];

    const contractReceipt = await (
      await developerContract[methodName](address, amountBigNumber)
    ).wait();

    this.log(`Transaction hash: ${contractReceipt.transactionHash}`);
  }
}

type ResolveTokenArg = {
  tokenFromArgs: string | undefined;
  commandObj: CommandObj;
  isInteractive: boolean;
};

const resolveToken = ({
  commandObj,
  isInteractive,
  tokenFromArgs,
}: ResolveTokenArg) => {
  if (typeof tokenFromArgs === "string") {
    if (isToken(tokenFromArgs)) {
      return tokenFromArgs;
    }

    commandObj.warn(`Invalid token: ${tokenFromArgs}`);
  }

  return list({
    isInteractive,
    message: "Select token",
    options: [...TOKENS],
    oneChoiceMessage() {
      throw new Error("Unreachable");
    },
    onNoChoices() {
      throw new Error("Unreachable");
    },
  });
};
