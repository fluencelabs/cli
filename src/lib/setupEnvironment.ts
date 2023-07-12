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

import path from "node:path";

import dotenv from "dotenv";

import { type FluenceEnv, NETWORKS } from "./multiaddres.js";

export const FLUENCE_ENV = "FLUENCE_ENV";
export const DEBUG_COUNTLY = "DEBUG_COUNTLY";
export const FLUENCE_USER_DIR = "FLUENCE_USER_DIR";
export const RUN_TESTS_IN_PARALLEL = "RUN_TESTS_IN_PARALLEL";

dotenv.config();

const resolveEnvVariable = <T>(
  variableName: string,
  isValid: (v: unknown) => v is T,
): T => {
  const variable = process.env[variableName];

  if (!isValid(variable)) {
    throw new Error(
      `Invalid environment variable: ${variableName}="${String(variable)}"`,
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
  return typeof v === "string" && path.isAbsolute(v);
};

const isFluenceEnv = (v: unknown): v is FluenceEnv => {
  return typeof v === "string" && [...NETWORKS, "local"].includes(v);
};

setEnvVariable(FLUENCE_ENV, isFluenceEnv, "kras");
setEnvVariable(DEBUG_COUNTLY, isTrueOrFalseString, "false");
setEnvVariable(RUN_TESTS_IN_PARALLEL, isTrueOrFalseString, "true");
setEnvVariable(FLUENCE_USER_DIR, isAbsolutePath);
