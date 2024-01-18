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

import { DEFAULT_CC_DURATION } from "../const.js";
import { getReadonlyDealClient } from "../dealClient.js";

import type { ValidationResult } from "./validations.js";

export async function getMinCCDuration(isLocal: boolean): Promise<bigint> {
  let minDuration: bigint = BigInt(
    (parseDuration(DEFAULT_CC_DURATION) ?? 0) / 1000,
  );

  if (!isLocal) {
    try {
      const { readonlyDealClient } = await getReadonlyDealClient();
      const capacity = await readonlyDealClient.getCapacity();
      minDuration = await capacity.minDuration();
    } catch {}
  }

  return minDuration;
}

export async function ccDurationValidator(isLocal: boolean) {
  const minDuration = await getMinCCDuration(isLocal);

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
