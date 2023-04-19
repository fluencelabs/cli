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
import camelcase from "camelcase";

import { commandObj } from "../commandObj.js";

import { capitalize } from "./capitilize.js";
import { cleanAquaName, validateAquaName } from "./downloadFile.js";
import { stringifyUnknown } from "./jsonStringify.js";

export const jsToAqua = (
  v: unknown,
  funcNameFromArgs: string,
  useF64ForAllNumbers = false
): string => {
  const funcName = camelcase(cleanAquaName(funcNameFromArgs));
  const funcNameValidity = validateAquaName(funcName);

  if (typeof funcNameValidity === "string") {
    return commandObj.error(
      `Failed converting object to aqua. ${color.yellow(
        funcNameFromArgs
      )} ${funcNameValidity}`
    );
  }

  const { type, value, typeDefs } = jsToAquaImpl(
    v,
    funcName,
    "",
    useF64ForAllNumbers
  );

  return `${
    typeDefs ?? ""
  }\n\nfunc ${funcName}() -> ${type}:\n    <- ${value}\n`;
};

const NULL = { type: "?u8", value: "nil" } as const;

const NUMBER_TYPES = ["u64", "i64", "f64"] as const;

export const jsToAquaImpl = (
  v: unknown,
  fieldName: string,
  currentNesting: string,
  useF64ForAllNumbers = false
): { type: string; value: string; typeDefs?: string | undefined } => {
  const error = (message: string) => {
    return commandObj.error(
      `Failed converting to aqua. ${message}. At ${color.yellow(
        currentNesting === "" ? "" : `${currentNesting}.`
      )}${color.yellow(fieldName)}: ${stringifyUnknown(v)}`
    );
  };

  if (typeof v === "string") {
    return { type: "string", value: `"${v}"` };
  }

  if (typeof v === "number") {
    const isInteger = Number.isInteger(v);

    const type = (() => {
      if (useF64ForAllNumbers || !isInteger) {
        return "f64";
      }

      if (v < 0) {
        return "i64";
      }

      return "u64";
    })();

    const stringNumber = v.toString();

    const value =
      type === "f64" && isInteger ? `${stringNumber}.0` : stringNumber;

    return { type, value };
  }

  if (typeof v === "boolean") {
    return { type: "bool", value: v.toString() };
  }

  if (v === null || v === undefined) {
    return NULL;
  }

  if (Array.isArray(v)) {
    if (v.length === 0) {
      return NULL;
    }

    const mappedToAqua = v.map((val) => {
      return jsToAquaImpl(val, fieldName, currentNesting, useF64ForAllNumbers);
    });

    const firstElementType = mappedToAqua[0]?.type ?? NULL.type;
    const isNumberType = NUMBER_TYPES.includes(firstElementType);

    const type = isNumberType
      ? mappedToAqua.reduce<string>(
          (acc, { type }) => {
            if (!NUMBER_TYPES.includes(type)) {
              return error("All array elements must be of the same type");
            }

            if (acc === "f64" || type === "f64") {
              return "f64";
            }

            if (acc === "i64" || type === "i64") {
              return "i64";
            }

            return "u64";
          },
          useF64ForAllNumbers ? "f64" : "u64"
        )
      : firstElementType;

    const { typeDefs } = mappedToAqua[0] ?? {};

    if (
      !isNumberType &&
      (!mappedToAqua.every((val) => {
        return val.type === type;
      }) ||
        !mappedToAqua.every((val) => {
          return val.typeDefs === typeDefs;
        }))
    ) {
      return error("All array elements must be of the same type");
    }

    return {
      type: `[]${type}`,
      value: `[${mappedToAqua
        .map(({ value }) => {
          return value;
        })
        .join(",")}]`,
      typeDefs,
    };
  }

  if (typeof v === "object") {
    const newName = capitalize(camelcase(cleanAquaName(fieldName)));

    if (!/^[A-Z]\w*$/.test(newName)) {
      return error(
        "Name must start with a letter and contain only letters, numbers and underscores"
      );
    }

    const objectEntries = Object.entries(v);

    if (objectEntries.length === 0) {
      return NULL;
    }

    const nestedType = `${currentNesting}${newName}`;

    const { keyTypes, keyDataTypes, entries } = objectEntries.reduce<{
      keyTypes: string[];
      keyDataTypes: string[];
      entries: string[];
    }>(
      ({ keyTypes, keyDataTypes, entries }, [key, val]) => {
        const { type, value, typeDefs } = jsToAquaImpl(
          val,
          key,
          nestedType,
          useF64ForAllNumbers
        );

        const camelCasedKey = camelcase(cleanAquaName(key));
        const keyValidity = validateAquaName(camelCasedKey);

        if (typeof keyValidity === "string") {
          return error(`Invalid key ${color.yellow(key)} ${keyValidity}`);
        }

        return {
          keyTypes: [...keyTypes, `    ${camelCasedKey}: ${type}`],
          keyDataTypes:
            typeDefs === undefined ? keyDataTypes : [...keyDataTypes, typeDefs],
          entries: [...entries, `${camelCasedKey}=${value}`],
        };
      },
      { keyTypes: [], keyDataTypes: [], entries: [] }
    );

    return {
      type: nestedType,
      value: `${nestedType}(${entries.join(",")})`,
      typeDefs: `${
        keyDataTypes.length === 0 ? "" : `${keyDataTypes.join("\n\n")}\n\n`
      }data ${nestedType}:\n${keyTypes.join("\n")}`,
    };
  }

  return error(`Unsupported type: ${typeof v}`);
};
