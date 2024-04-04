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

import { isAbsolute } from "node:path";

import dotenv from "dotenv";

import { type ChainENV, FLUENCE_ENVS } from "./const.js";
import { getIsStringUnion } from "./typeHelpers.js";

export const FLUENCE_ENV = "FLUENCE_ENV";
export const DEBUG_COUNTLY = "DEBUG_COUNTLY";
export const FLUENCE_USER_DIR = "FLUENCE_USER_DIR";
export const CI = "CI";
export const RUN_TESTS_IN_PARALLEL = "RUN_TESTS_IN_PARALLEL";

dotenv.config();

const resolveEnvVariable = <T>(
  variableName: string,
  isValid: (v: unknown) => v is T,
): T => {
  const variable = process.env[variableName];

  if (!isValid(variable)) {
    throw new Error(
      variable === undefined
        ? `Environment variable not set: ${variableName}`
        : `Invalid environment variable: ${variableName}="${variable}"`,
    );
  }

  return variable;
};

const setEnvVariable = <T extends string>(
  variableName: string,
  isValid: (v: unknown) => v is T,
  defaultVariable?: T,
) => {
  const variable = process.env[variableName];

  if (variable === undefined) {
    if (defaultVariable !== undefined) {
      process.env[variableName] = defaultVariable;
    }

    return;
  }

  process.env[variableName] = resolveEnvVariable(variableName, isValid);
};

const isTrueOrFalseString = (v: unknown): v is "true" | "false" => {
  return v === "true" || v === "false";
};

const isAbsolutePath = (v: unknown): v is string => {
  return typeof v === "string" && isAbsolute(v);
};

const isFluenceEnvWithoutCustom = getIsStringUnion(
  FLUENCE_ENVS.filter((e): e is ChainENV => {
    return e !== "custom";
  }),
);

setEnvVariable(FLUENCE_ENV, isFluenceEnvWithoutCustom, "local");
setEnvVariable(DEBUG_COUNTLY, isTrueOrFalseString, "false");
setEnvVariable(RUN_TESTS_IN_PARALLEL, isTrueOrFalseString, "true");
setEnvVariable(CI, isTrueOrFalseString, "false");
setEnvVariable(FLUENCE_USER_DIR, isAbsolutePath);
