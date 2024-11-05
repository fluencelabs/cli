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

import { color } from "@oclif/color";
import parseDuration from "parse-duration";

import { versions } from "../../versions.js";
import { getReadonlyContracts } from "../dealClient.js";
import { ensureChainEnv } from "../ensureChainNetwork.js";
import { bigintToStr, numToStr } from "../helpers/typesafeStringify.js";
import { stringifyUnknown } from "../helpers/stringifyUnknown.js";
import type { ValidationResult } from "../helpers/validations.js";

export async function getMinCCDuration(): Promise<bigint> {
  let minDuration: bigint = 0n;

  if ((await ensureChainEnv()) !== "local") {
    try {
      const { readonlyContracts } = await getReadonlyContracts();
      minDuration = await readonlyContracts.diamond.minDuration();
    } catch {}
  }

  return minDuration;
}

export async function ccDurationValidator() {
  const minDuration = await getMinCCDuration();

  return function validateCCDuration(input: string): ValidationResult {
    const parsed = parseDuration(input);

    if (parsed === undefined) {
      return "Failed to parse duration";
    }

    const parsedSeconds = parsed / 1000;

    if (parsedSeconds < minDuration) {
      return `Must be at least ${bigintToStr(minDuration)} sec. Got: ${numToStr(parsedSeconds)} sec`;
    }

    return true;
  };
}

export async function validateAddress(
  input: unknown,
): Promise<ValidationResult> {
  const { isAddress } = await import("ethers");
  return (
    isAddress(input) ||
    `Must be a valid address. Got: ${color.yellow(stringifyUnknown(input))}`
  );
}

let protocolVersions:
  | undefined
  | Promise<{ minProtocolVersion: bigint; maxProtocolVersion: bigint }>;

export async function getProtocolVersions() {
  if (protocolVersions === undefined) {
    protocolVersions = (async () => {
      let minProtocolVersion = BigInt(versions.protocolVersion);
      let maxProtocolVersion = minProtocolVersion;

      if ((await ensureChainEnv()) !== "local") {
        const { readonlyContracts } = await getReadonlyContracts();

        [minProtocolVersion, maxProtocolVersion] = await Promise.all([
          readonlyContracts.diamond.minProtocolVersion(),
          readonlyContracts.diamond.maxProtocolVersion(),
        ]);
      }

      return { minProtocolVersion, maxProtocolVersion };
    })();
  }

  return protocolVersions;
}

export async function validateProtocolVersion(
  protocolVersion: number,
): Promise<ValidationResult> {
  const { minProtocolVersion, maxProtocolVersion } =
    await getProtocolVersions();

  if (
    protocolVersion < minProtocolVersion ||
    protocolVersion > maxProtocolVersion
  ) {
    const minProtocolVersionStr = bigintToStr(minProtocolVersion);

    if (minProtocolVersion === maxProtocolVersion) {
      return `Protocol version must be equal to ${color.yellow(
        minProtocolVersionStr,
      )}. Got: ${color.yellow(protocolVersion)}`;
    }

    return `Protocol version must be ${color.yellow(
      `>=${minProtocolVersionStr}`,
    )} and ${color.yellow(`<=${minProtocolVersionStr}`)}. Got: ${color.yellow(
      protocolVersion,
    )}`;
  }

  return true;
}
