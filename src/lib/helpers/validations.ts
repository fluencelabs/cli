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

import { splitErrorsAndResults, stringifyUnknown } from "./utils.js";

export type ValidationResult = string | true;

export const validateUnique = <T>(
  array: Array<T>,
  getField: (item: T) => string,
  getError: (notUniqueField: string) => string,
): ValidationResult => {
  const set = new Set();

  for (const item of array) {
    const field = getField(item);

    if (set.has(field)) {
      return getError(field);
    }

    set.add(field);
  }

  return true;
};

export const validateHasDefault = <T>(
  array: Array<T>,
  defaultValue: string,
  getField: (item: T) => string,
  errorText: string,
): ValidationResult => {
  return (
    array.some((item): boolean => {
      return getField(item) === defaultValue;
    }) || errorText
  );
};

export const validateBatch = (
  ...args: Array<ValidationResult>
): ValidationResult => {
  const errors = args.filter((result): result is string => {
    return typeof result === "string";
  });

  return errors.length === 0 ? true : errors.join("\n");
};

export const validateBatchAsync = async (
  ...args: Array<Promise<ValidationResult> | ValidationResult>
): Promise<ValidationResult> => {
  const errors = (await Promise.all(args)).filter(
    (result): result is string => {
      return typeof result === "string";
    },
  );

  return errors.length === 0 ? true : errors.join("\n");
};

export const isExactVersion = async (version: string): Promise<boolean> => {
  const semver = await import("semver");
  return semver.clean(version) === version;
};

export async function validateVersionsIsExact(
  dependency: string,
  version: string | undefined,
): Promise<ValidationResult> {
  if (version === undefined || (await isExactVersion(version))) {
    return true;
  }

  return `${dependency} version must have exact version. Found: ${version}`;
}

export function validatePositiveNumberOrEmpty(
  input: unknown,
): ValidationResult {
  if (input === "" || Number(input) > 0) {
    return true;
  }

  return "Must be a positive number";
}

export function lessThenValidator(lessThen: number) {
  return function validateLessThen(input: unknown): ValidationResult {
    if (input === "" || Number(input) < lessThen) {
      return true;
    }

    return `Must be less then ${lessThen}`;
  };
}

export function greaterThenValidator(greaterThen: number) {
  return function validateGreaterThen(input: unknown): ValidationResult {
    if (input === "" || Number(input) > greaterThen) {
      return true;
    }

    return `Must be greater then ${greaterThen}`;
  };
}

export function validatePercent(input: unknown): ValidationResult {
  return validateBatch(
    validatePositiveNumberOrEmpty(input),
    lessThenValidator(100)(input),
  );
}

export async function validateCIDs(
  CIDs: Array<{
    cid: string;
    location: string;
  }>,
): Promise<ValidationResult> {
  const { CID } = await import("ipfs-http-client");

  const [errors] = splitErrorsAndResults(
    CIDs,
    ({ location, cid: effector }) => {
      try {
        CID.parse(effector);
        return { result: true };
      } catch (e) {
        return { error: `${location}:\n${stringifyUnknown(e)}` };
      }
    },
  );

  if (errors.length > 0) {
    return `Invalid CIDs:\n\n${errors.join("\n\n")}`;
  }

  return true;
}
