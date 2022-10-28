/**
 * Copyright 2022 Fluence Labs Limited
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

import assert from "node:assert";

/**
 * Converts js or ts template literal to string, adds eslint-disable and ts-nocheck comments
 * Also replaces all interpolated booleans to be either ".js" or ".ts"
 *
 * @param strings - array of strings that are not interpolated
 * @param expressions - array of expressions that are interpolated
 * @returns string
 */
export const js = (
  strings: TemplateStringsArray,
  ...expressions: Array<boolean | string>
): string => {
  let result = `/* eslint-disable */
// @ts-nocheck
`;

  for (const [index, expression] of expressions.entries()) {
    const string = strings[index];
    assert(typeof string === "string", "Unreachable. JS template bug");
    result = `${result}${string}${resolveExpressionInJSLiteral(expression)}`;
  }

  const lastString = strings[strings.length - 1];
  assert(typeof lastString === "string", "Unreachable. JS template bug");

  return `${result}${lastString}
/* eslint-enable */
`;
};

const resolveExpressionInJSLiteral = (expression: string | boolean): string => {
  if (typeof expression === "string") {
    return expression;
  }

  return expression ? ".js" : ".ts";
};
