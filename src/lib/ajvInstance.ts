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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import Ajv from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

export const ajv = new Ajv.default({
  allowUnionTypes: true,
  code: { esm: true },
});

type AjvErrors =
  | Ajv.ErrorObject<string, Record<string, unknown>, unknown>[]
  | null
  | undefined;

export const validationErrorToString = (errors: AjvErrors) => {
  if (errors === null || errors === undefined) {
    return "";
  }

  return (
    "Errors:\n\n" +
    errors
      .filter(({ instancePath }) => {
        return instancePath !== "";
      })
      .map(({ instancePath, params, message }) => {
        const paramsMessage = yamlDiffPatch("", {}, params);
        return `${color.yellow(instancePath)} ${
          message ?? ""
        }\n${paramsMessage}`;
      })
      .join("\n")
  );
};
