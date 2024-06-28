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

import { isAbsolute } from "node:path";

import dotenv from "dotenv";

import { CHAIN_ENV, getIsUnion } from "../common.js";

export const FLUENCE_ENV = "FLUENCE_ENV";
export const DEBUG_COUNTLY = "DEBUG_COUNTLY";
export const FLUENCE_USER_DIR = "FLUENCE_USER_DIR";
export const CI = "CI";

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

setEnvVariable(FLUENCE_ENV, getIsUnion(CHAIN_ENV), "local");
setEnvVariable(DEBUG_COUNTLY, isTrueOrFalseString, "false");
setEnvVariable(CI, isTrueOrFalseString, "false");
setEnvVariable(FLUENCE_USER_DIR, isAbsolutePath);
