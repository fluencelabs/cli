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
import parseDuration from "parse-duration";

import { getReadonlyDealClient } from "../dealClient.js";
import { ensureChainEnv } from "../ensureChainNetwork.js";
import type { ValidationResult } from "../helpers/validations.js";

export async function getMinCCDuration(): Promise<bigint> {
  let minDuration: bigint = 0n;

  if ((await ensureChainEnv()) !== "local") {
    try {
      const { readonlyDealClient } = await getReadonlyDealClient();
      const capacity = await readonlyDealClient.getCapacity();
      minDuration = await capacity.minDuration();
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
      return `Must be at least ${minDuration} sec. Got: ${parsedSeconds} sec`;
    }

    return true;
  };
}

export async function validateAddress(
  input: unknown,
): Promise<ValidationResult> {
  const { ethers } = await import("ethers");

  if (ethers.isAddress(input)) {
    return true;
  }

  return `Must be a valid address. Got: ${color.yellow(String(input))}`;
}

async function getProtocolVersions() {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const core = await readonlyDealClient.getCore();

  const [minProtocolVersion, maxProtocolVersion] = await Promise.all([
    core.minProtocolVersion(),
    core.maxProtocolVersion(),
  ]);

  return { minProtocolVersion, maxProtocolVersion };
}

let protocolVersions: undefined | ReturnType<typeof getProtocolVersions>;

export async function validateProtocolVersion(
  protocolVersion: number,
): Promise<ValidationResult> {
  protocolVersions =
    protocolVersions === undefined ? getProtocolVersions() : protocolVersions;

  const { minProtocolVersion, maxProtocolVersion } = await protocolVersions;

  if (
    protocolVersion < minProtocolVersion ||
    protocolVersion > maxProtocolVersion
  ) {
    if (minProtocolVersion === maxProtocolVersion) {
      return `Protocol version must be equal to ${color.yellow(
        `${minProtocolVersion}`,
      )}. Got: ${color.yellow(protocolVersion)}`;
    }

    return `Protocol version must be ${color.yellow(
      `>=${minProtocolVersion}`,
    )} and ${color.yellow(`<=${maxProtocolVersion}`)}. Got: ${color.yellow(
      protocolVersion,
    )}`;
  }

  return true;
}
