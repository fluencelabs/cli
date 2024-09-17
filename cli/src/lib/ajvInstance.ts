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
import Ajv from "ajv";
import addFormats from "ajv-formats";

import { jsonStringify } from "../common.js";

import { numToStr } from "./helpers/typesafeStringify.js";

export const ajv = new Ajv.default({
  allowUnionTypes: true,
  code: { esm: true },
});

addFormats.default(ajv);

type AjvErrors =
  | Ajv.ErrorObject<string, Record<string, unknown>>[]
  | null
  | undefined;

// TODO: attempt to make this error reliable DJX-538
const NOT_USEFUL_AJV_ERROR =
  "must match exactly one schema in oneOf\npassingSchemas: null\n";

export async function validationErrorToString(
  errors: AjvErrors,
  latestConfigVersion?: string | number,
) {
  if (errors === null || errors === undefined) {
    return "";
  }

  const { yamlDiffPatch } = await import("yaml-diff-patch");

  return (
    "Errors:\n\n" +
    errors
      .map(({ instancePath, params, message }, i) => {
        const paramsMessage = yamlDiffPatch("", {}, params);
        const prevError = errors[i - 1];

        const isPreviousVersionError =
          latestConfigVersion !== undefined &&
          instancePath === "/version" &&
          message === "must be equal to constant" &&
          !paramsMessage.includes(
            typeof latestConfigVersion === "string"
              ? latestConfigVersion
              : numToStr(latestConfigVersion),
          );

        const isDuplicateError =
          prevError?.instancePath === instancePath &&
          jsonStringify(prevError.params) === jsonStringify(params) &&
          prevError.message === message;

        if (isPreviousVersionError || isDuplicateError) {
          return "";
        }

        return `${instancePath === "" ? "" : `${color.yellow(instancePath)} `}${message ?? ""}${paramsMessage === "" ? "" : `\n${paramsMessage}`}`;
      })
      .filter((s) => {
        return s !== "" && s !== NOT_USEFUL_AJV_ERROR;
      })
      .join("\n")
  );
}
