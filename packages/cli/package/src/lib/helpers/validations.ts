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

import { numToStr } from "./typesafeStringify.js";
import { splitErrorsAndResults } from "./utils.js";
import { stringifyUnknown } from "./stringifyUnknown.js";

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

    return `Must be less then ${numToStr(lessThen)}`;
  };
}

export function greaterThenValidator(greaterThen: number) {
  return function validateGreaterThen(input: unknown): ValidationResult {
    if (input === "" || Number(input) > greaterThen) {
      return true;
    }

    return `Must be greater then ${numToStr(greaterThen)}`;
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
    return `\nInvalid CIDs:\n\n${errors.join("\n\n")}`;
  }

  return true;
}
