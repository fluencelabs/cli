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
