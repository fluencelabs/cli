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

export type ValidationResult = string | true;

export const validateBatch = (
  ...args: Array<ValidationResult>
): ValidationResult => {
  const errors = args.filter((result): result is string => {
    return typeof result === "string";
  });

  return errors.length === 0 ? true : errors.join("\n");
};

export const isExactVersion = async (version: string): Promise<boolean> => {
  const semver = await import("semver");
  return semver.clean(version) === version;
};

export const validateAllVersionsAreExact = async (
  versions: Record<string, string>,
): Promise<ValidationResult> => {
  const versionsWithExactness = await Promise.all(
    Object.entries(versions).map(async ([name, version]) => {
      return [name, version, await isExactVersion(version)] as const;
    }),
  );

  const notExactVersions = versionsWithExactness.filter(([, , isExact]) => {
    return !isExact;
  });

  return notExactVersions.length === 0
    ? true
    : `The following dependencies don't have exact versions: ${notExactVersions
        .map(([name, version]) => {
          return `${name}: ${version}`;
        })
        .join(", ")}`;
};

export const validatePositiveNumberOrEmpty = (
  input: unknown,
): ValidationResult => {
  if (input === "") {
    return true;
  }

  const parsed = Number(input);

  if (Number.isNaN(parsed)) {
    return "Must be a number";
  }

  if (parsed <= 0) {
    return "Must be a positive number";
  }

  return true;
};
