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
import Ajv from "ajv";

import { jsonStringify } from "./helpers/utils.js";

export const ajv = new Ajv.default({
  allowUnionTypes: true,
  code: { esm: true },
});

type AjvErrors =
  | Ajv.ErrorObject<string, Record<string, unknown>>[]
  | null
  | undefined;

const NOT_USEFUL_AJV_ERROR =
  "must match exactly one schema in oneOf\npassingSchemas: null\n";

export const validationErrorToString = async (
  errors: AjvErrors,
  latestConfigVersion?: string | number,
) => {
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
          !paramsMessage.includes(`${latestConfigVersion}`);

        const isDuplicateError =
          prevError?.instancePath === instancePath &&
          jsonStringify(prevError.params) === jsonStringify(params) &&
          prevError.message === message;

        if (isPreviousVersionError || isDuplicateError) {
          return "";
        }

        return `${instancePath === "" ? "" : `${color.yellow(instancePath)} `}${
          message ?? ""
        }${paramsMessage === "" ? "" : `\n${paramsMessage}`}`;
      })
      .filter((s) => {
        return s !== "" && s !== NOT_USEFUL_AJV_ERROR;
      })
      .join("\n")
  );
};
