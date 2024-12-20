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
import { getReadonlyContracts } from "../dealClient.js";
import { numToStr } from "../helpers/typesafeStringify.js";

export async function fltParse(value: string): Promise<bigint> {
  const { parseEther } = await import("ethers");
  return parseEther(value);
}

async function fltFormat(value: bigint): Promise<string> {
  const { formatEther } = await import("ethers");
  return formatEther(value);
}

export async function fltFormatWithSymbol(value: bigint): Promise<string> {
  return `${await fltFormat(value)} ${FLT_SYMBOL}`;
}

export async function ptParse(value: string): Promise<bigint> {
  const { parseUnits } = await import("ethers");
  return parseUnits(value, await getPtDecimals());
}

export async function ptFormat(value: bigint): Promise<string> {
  const { formatUnits } = await import("ethers");
  return formatUnits(value, await getPtDecimals());
}

export async function ptFormatWithSymbol(value: bigint): Promise<string> {
  return `${await ptFormat(value)} ${PT_SYMBOL}`;
}

let ptDecimalsPromise: Promise<number> | undefined;

async function getPtDecimals() {
  if (ptDecimalsPromise === undefined) {
    ptDecimalsPromise = (async () => {
      const { id } = await import("ethers");
      const { readonlyContracts, provider } = await getReadonlyContracts();

      const decimalsRaw = await provider.call({
        to: readonlyContracts.deployment.usdc,
        data: id("decimals()").substring(0, 10),
      });

      const decimals = parseInt(decimalsRaw);
      dbg(`Got ${PT_SYMBOL} number of decimals: ${numToStr(decimals)}`);
      return decimals;
    })();
  }

  return ptDecimalsPromise;
}
