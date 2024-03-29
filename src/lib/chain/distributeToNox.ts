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

import assert from "assert";

import { color } from "@oclif/color";
import { ethers } from "ethers";

import { setChainFlags, chainFlags } from "../chainFlags.js";
import { commandObj } from "../commandObj.js";
import { resolveComputePeersByNames } from "../configs/project/provider.js";
import {
  NOX_NAMES_FLAG_NAME,
  FLT_SYMBOL,
  PRIV_KEY_FLAG_NAME,
  MAX_TOKEN_AMOUNT_KEYWORD,
} from "../const.js";
import { getDealClient } from "../dealClient.js";
import { input } from "../prompt.js";

import { fltFormatWithSymbol, fltParse } from "./currencies.js";

export async function distributeToNox(flags: {
  amount?: string | undefined;
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
}) {
  const computePeers = await resolveComputePeersByNames(flags);
  const { signerOrWallet } = await getDealClient();

  const amount =
    flags.amount ??
    (await input({
      message: `Enter the amount of ${FLT_SYMBOL} tokens to distribute to noxes`,
    }));

  const parsedAmount = await fltParse(amount);
  const formattedAmount = color.yellow(await fltFormatWithSymbol(parsedAmount));

  for (const computePeer of computePeers) {
    const txResponse = await signerOrWallet.sendTransaction({
      to: computePeer.walletAddress,
      value: parsedAmount,
    });

    const tx = await txResponse.wait();

    commandObj.logToStderr(
      `Successfully distributed ${formattedAmount} to ${color.yellow(
        computePeer.name,
      )} with tx hash: ${color.yellow(tx?.hash)}`,
    );
  }
}

export async function withdrawFromNox(flags: {
  amount?: string | undefined;
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
}) {
  const computePeers = await resolveComputePeersByNames(flags);
  const { signerOrWallet } = await getDealClient();
  const providerWalletAddress = await signerOrWallet.getAddress();

  const amount =
    flags.amount ??
    (await input({
      message: `Enter the amount of ${FLT_SYMBOL} tokens to distribute to noxes. Use ${color.yellow(
        MAX_TOKEN_AMOUNT_KEYWORD,
      )} to withdraw maximum possible amount`,
      async validate(val: string) {
        if (val === MAX_TOKEN_AMOUNT_KEYWORD) {
          return true;
        }

        let parsedAmount: bigint;

        try {
          parsedAmount = await fltParse(val);

          if (parsedAmount <= 0n) {
            return "Amount should be greater than 0";
          }

          return true;
        } catch {
          return "Invalid amount";
        }
      },
    }));

  for (const { walletKey, name } of computePeers) {
    setChainFlags({
      ...chainFlags,
      [PRIV_KEY_FLAG_NAME]: walletKey,
    });

    const { signerOrWallet } = await getDealClient();

    const { amountBigInt, txResponse } =
      amount === MAX_TOKEN_AMOUNT_KEYWORD
        ? await withdrawMaxAmount(signerOrWallet, providerWalletAddress)
        : await withdrawSpecificAmount(
            await fltParse(amount),
            signerOrWallet,
            providerWalletAddress,
          );

    const formattedAmount = color.yellow(
      await fltFormatWithSymbol(amountBigInt),
    );

    const tx = await txResponse.wait();

    commandObj.logToStderr(
      `Successfully withdrawn ${formattedAmount} from ${color.yellow(
        name,
      )} with tx hash: ${color.yellow(tx?.hash)}`,
    );
  }
}

async function withdrawMaxAmount(
  signerOrWallet: ethers.JsonRpcSigner | ethers.Wallet,
  providerWalletAddress: string,
) {
  const gasLimit = await signerOrWallet.estimateGas({
    to: await signerOrWallet.getAddress(),
    value: 0n,
  });

  const provider = signerOrWallet.provider;
  assert(provider !== null, "Unreachable. We ensure provider is not null");
  const gasPrice = await provider.getFeeData();

  if (
    gasPrice.maxFeePerGas === null ||
    gasPrice.maxPriorityFeePerGas === null
  ) {
    return commandObj.error(
      `Wasn't able to get gas price data. Please don't use "${MAX_TOKEN_AMOUNT_KEYWORD}" and specify exact amount of tokens to withdraw instead`,
    );
  }

  const feeAmount =
    (gasPrice.maxFeePerGas + gasPrice.maxPriorityFeePerGas) * gasLimit;

  const totalBalance = await provider.getBalance(
    await signerOrWallet.getAddress(),
  );

  const amountBigInt = totalBalance - feeAmount;

  return {
    txResponse: await signerOrWallet.sendTransaction({
      to: providerWalletAddress,
      value: amountBigInt,
      gasLimit: gasLimit,
      maxFeePerGas: gasPrice.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
    }),
    amountBigInt,
  };
}

async function withdrawSpecificAmount(
  amountBigInt: bigint,
  signerOrWallet: ethers.JsonRpcSigner | ethers.Wallet,
  providerWalletAddress: string,
) {
  return {
    txResponse: await signerOrWallet.sendTransaction({
      to: providerWalletAddress,
      value: amountBigInt,
    }),
    amountBigInt,
  };
}
