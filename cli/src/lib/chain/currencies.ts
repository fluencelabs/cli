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

import { FLT_SYMBOL, PT_SYMBOL } from "../const.js";
import { dbg } from "../dbg.js";
import { getReadonlyDealClient } from "../dealClient.js";
import { numToStr } from "../helpers/typesafeStringify.js";

export async function fltParse(value: string): Promise<bigint> {
  const { ethers } = await import("ethers");
  return ethers.parseEther(value);
}

export async function fltFormat(value: bigint): Promise<string> {
  const { ethers } = await import("ethers");
  return ethers.formatEther(value);
}

export async function fltFormatWithSymbol(value: bigint): Promise<string> {
  return `${await fltFormat(value)} ${FLT_SYMBOL}`;
}

export async function ptParse(value: string): Promise<bigint> {
  const { ethers } = await import("ethers");
  return ethers.parseUnits(value, await getPtDecimals());
}

export async function ptFormat(value: bigint): Promise<string> {
  const { ethers } = await import("ethers");
  return ethers.formatUnits(value, await getPtDecimals());
}

export async function ptFormatWithSymbol(value: bigint): Promise<string> {
  return `${await ptFormat(value)} ${PT_SYMBOL}`;
}

let ptDecimalsPromise: Promise<number> | undefined;

export async function getPtDecimals() {
  if (ptDecimalsPromise === undefined) {
    ptDecimalsPromise = (async () => {
      const { ethers } = await import("ethers");
      const { readonlyDealClient, provider } = await getReadonlyDealClient();
      const usdc = readonlyDealClient.getUSDC();

      const decimalsRaw = await provider.call({
        to: await usdc.getAddress(),
        data: ethers.id("decimals()").substring(0, 10),
      });

      const decimals = parseInt(decimalsRaw);
      dbg(`Got ${PT_SYMBOL} number of decimals: ${numToStr(decimals)}`);
      return decimals;
    })();
  }

  return ptDecimalsPromise;
}
