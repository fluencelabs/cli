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

import assert from "assert";
import { readFile, writeFile } from "fs/promises";
import { join, sep } from "path";

import { color } from "@oclif/color";
import camelCase from "lodash-es/camelCase.js";
import startCase from "lodash-es/startCase.js";

import { commandObj } from "../commandObj.js";
import { AQUA_EXT, FS_OPTIONS } from "../const.js";
import { input } from "../prompt.js";

import { capitalize } from "./capitilize.js";
import { cleanAquaName, validateAquaName } from "./downloadFile.js";
import { stringifyUnknown } from "./jsonStringify.js";

export const TOP_LEVEL_TYPE_NAME = "ReturnType";

/**
 * In js object, json or yaml when you want to represent optional value and still generate a type for it you can use this syntax:
 * { $$optional: <someValue>, $$isNil: <boolean> }
 */
const OPTIONAL = "$$optional";
/**
 * When `$$isNil == true`, the value is represented as `nil` in aqua but it will still have type inferred from `$$optional` value.
 */
const IS_NIL = "$$isNil";

type EmptyObject = Record<string, never>;

/**
 * Empty object and empty array are inferred as nil
 * because there is no way to infer a reasonable aqua type from just an empty object or empty array
 */
type NilInAqua = undefined | null | EmptyObject | [];

/**
 * This function is used in order to construct optional syntax in js that is converted to optional values in aqua.
 *
 * @param value - value to be converted. Can be anything.
 * @param valueToInferTypeFrom - a fallback that is used by jsToAqua function to infer the type of the value if value is missing (is null, undefined, empty object or empty array)
 * @returns - js object with special syntax that is converted to optional value in aqua inside jsToAqua function
 *
 * @example
 * const v = makeOptional(1, 1);
 * // v = { $$optional: 1 }
 * @example
 * const v = makeOptional(undefined, 1);
 * // v = { $$optional: 1, $$isNil: true }
 * @example
 * const v = makeOptional(null, 1);
 * // v = { $$optional: 1, $$isNil: true }
 */
export const makeOptional = <T>(
  value: T | NilInAqua,
  valueToInferTypeFrom: T,
): { [OPTIONAL]: T; [IS_NIL]?: boolean } => {
  const optional: { [OPTIONAL]: T; [IS_NIL]?: true } = {
    [OPTIONAL]: isNilInAqua(value) ? valueToInferTypeFrom : value,
  };

  if (isNilInAqua(value)) {
    optional[IS_NIL] = true;
  }

  return optional;
};

const isNilInAqua = <T>(v: T | NilInAqua): v is NilInAqua => {
  return (
    v === undefined ||
    v === null ||
    (typeof v === "object" && Object.keys(v).length === 0) ||
    (Array.isArray(v) && v.length === 0)
  );
};

export const jsToAqua = (
  v: unknown,
  fileName: string,
  useF64ForAllNumbers = false,
): string => {
  const moduleName = startCase(cleanAquaName(fileName)).split(" ").join("");

  const { type, value, typeDefs } = jsToAquaImpl(
    v,
    TOP_LEVEL_TYPE_NAME,
    "",
    useF64ForAllNumbers,
  );

  return `aqua ${moduleName} declares *\n\n${
    typeDefs === undefined ? "" : `${typeDefs}\n\n`
  }func get() -> ${type}:\n    <- ${value}\n`;
};

const NIL = { type: "?u8", value: "nil" } as const;

const NUMBER_TYPES = ["u64", "i64", "f64"] as const;

const INDENTATION = "    ";

export const jsToAquaImpl = (
  v: unknown,
  fieldName: string,
  currentNesting: string,
  useF64ForAllNumbers = false,
  nestingLevel = 1,
): { type: string; value: string; typeDefs?: string | undefined } => {
  const error = (message: string) => {
    return commandObj.error(
      `Failed converting to aqua. ${message}. At ${color.yellow(
        currentNesting === "" ? "" : `${currentNesting}.`,
      )}${color.yellow(fieldName)}: ${stringifyUnknown(v)}`,
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

  if (isNilInAqua(v)) {
    return NIL;
  }

  const newNestingLevel = nestingLevel + 1;
  const prevIndent = INDENTATION.repeat(nestingLevel);
  const newIndent = INDENTATION.repeat(newNestingLevel);

  if (Array.isArray(v)) {
    const mappedToAqua = v.map((val) => {
      return jsToAquaImpl(
        val,
        fieldName,
        currentNesting,
        useF64ForAllNumbers,
        newNestingLevel,
      );
    });

    const firstElementType = mappedToAqua[0]?.type ?? NIL.type;
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
          useF64ForAllNumbers ? "f64" : "u64",
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
      value: `[\n${newIndent}${mappedToAqua
        .map(({ value }) => {
          return value;
        })
        .join(`,\n${newIndent}`)}\n${prevIndent}]`,
      typeDefs,
    };
  }

  if (typeof v === "object") {
    assert(v !== null, "we checked v is not null with isNilInAqua");
    const newName = capitalize(camelCase(cleanAquaName(fieldName)));

    if (!/^[A-Z]\w*$/.test(newName)) {
      return error(
        `Name must start with a letter and contain only letters, numbers and underscores. Got: ${color.yellow(
          newName,
        )}`,
      );
    }

    if (newName === TOP_LEVEL_TYPE_NAME && nestingLevel > 1) {
      return error(
        `Please don't name your top-level property as ${color.yellow(
          TOP_LEVEL_TYPE_NAME,
        )}`,
      );
    }

    const objectEntries = Object.entries(v);
    const nestedType = `${currentNesting}${newName}`;

    if (OPTIONAL in v) {
      const { type, value, typeDefs } = jsToAquaImpl(
        v[OPTIONAL],
        fieldName,
        currentNesting,
        useF64ForAllNumbers,
        nestingLevel,
      );

      return {
        type: `?${type}`,
        value: IS_NIL in v && v[IS_NIL] === true ? NIL.value : `?[${value}]`,
        typeDefs,
      };
    }

    const { keyTypes, keyDataTypes, entries } = objectEntries.reduce<{
      keyTypes: string[];
      keyDataTypes: string[];
      entries: string[];
    }>(
      ({ keyTypes, keyDataTypes, entries }, [key, val]) => {
        const { type, value, typeDefs } = jsToAquaImpl(
          val,
          key,
          newName === TOP_LEVEL_TYPE_NAME ? "" : nestedType,
          useF64ForAllNumbers,
          newNestingLevel,
        );

        const camelCasedKey = camelCase(cleanAquaName(key));
        const keyValidity = validateAquaName(camelCasedKey);

        if (typeof keyValidity === "string") {
          return error(`Invalid key ${color.yellow(key)} ${keyValidity}`);
        }

        return {
          keyTypes: [...keyTypes, `    ${camelCasedKey}: ${type}`],
          keyDataTypes:
            typeDefs === undefined ? keyDataTypes : [...keyDataTypes, typeDefs],
          entries: [...entries, `\n${newIndent}${camelCasedKey}=${value}`],
        };
      },
      { keyTypes: [], keyDataTypes: [], entries: [] },
    );

    return {
      type: nestedType,
      value: `${nestedType}(${entries.join(",")}\n${INDENTATION.repeat(
        nestingLevel,
      )})`,
      typeDefs: `${
        keyDataTypes.length === 0 ? "" : `${keyDataTypes.join("\n\n")}\n\n`
      }data ${nestedType}:\n${keyTypes.join("\n")}`,
    };
  }

  return error(`Unsupported type: ${typeof v}`);
};

export async function fileToAqua(
  inputPathArg: string | undefined,
  outputPathArg: string | undefined,
  f64: boolean,
  parseFn: (content: string) => unknown,
) {
  const inputPath =
    inputPathArg ?? (await input({ message: "Enter path to input file" }));

  const content = await readFile(inputPath, FS_OPTIONS);
  const parsedContent = parseFn(content);

  let outputPath = outputPathArg;

  if (outputPath === undefined) {
    const inputFilePath = inputPath.split(sep);
    const inputFileNameWithExt = inputFilePath.pop();
    const inputPathWithoutFileName = inputFilePath.join(sep);
    assert(inputFileNameWithExt !== undefined);
    const inputFileNameWithExtArr = inputFileNameWithExt.split(".");

    const outputPathWithoutExt =
      inputFileNameWithExtArr.length === 1
        ? inputFileNameWithExtArr[0]
        : inputFileNameWithExtArr.slice(0, -1).join(".");

    assert(outputPathWithoutExt !== undefined);

    outputPath = join(
      inputPathWithoutFileName,
      `${outputPathWithoutExt}.${AQUA_EXT}`,
    );
  }

  const fileNameWithExt = outputPath.split(sep).pop();
  assert(fileNameWithExt !== undefined);
  const fileNameWithExtArr = fileNameWithExt.split(".");
  const ext = fileNameWithExtArr.pop();

  if (ext !== "aqua") {
    commandObj.error("Output file must have .aqua extension");
  }

  const fileName = fileNameWithExtArr.join(".");

  const aqua = jsToAqua(parsedContent, fileName, f64);
  await writeFile(outputPath, aqua, FS_OPTIONS);
  commandObj.logToStderr(`Created aqua file at ${color.yellow(outputPath)}`);
}
