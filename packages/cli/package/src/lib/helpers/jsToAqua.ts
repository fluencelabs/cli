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

import assert from "assert";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, parse } from "path";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import camelCase from "lodash-es/camelCase.js";
import upperFirst from "lodash-es/upperFirst.js";

import { validationErrorToString, ajv } from "../ajvInstance.js";
import { commandObj } from "../commandObj.js";
import { AQUA_EXT, FS_OPTIONS } from "../const.js";
import { input } from "../prompt.js";

import { validateAquaTypeName, validateAquaName } from "./downloadFile.js";
import { stringifyUnknown } from "./stringifyUnknown.js";
import { boolToStr, numToStr } from "./typesafeStringify.js";

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

function isNilInAqua(v: unknown): v is NilInAqua {
  return (
    v === undefined ||
    v === null ||
    (typeof v === "object" && Object.keys(v).length === 0) ||
    (Array.isArray(v) && v.length === 0)
  );
}

function dedupeTypeDefs(typeDefs: string): string {
  return [...new Set(typeDefs.split("\n\n"))].join("\n\n");
}

function toAquaType(s: string): string | Error {
  const aquaType = upperFirst(camelCase(s));
  const validity = validateAquaTypeName(aquaType);

  if (typeof validity === "string") {
    return new Error(validity);
  }

  return aquaType;
}

export type JsToAquaArg = {
  valueToConvert: unknown;
  fileName: string;
  useF64ForAllNumbers?: boolean;
  customTypes?: CustomTypes;
};

export const jsToAqua = ({
  valueToConvert,
  fileName,
  useF64ForAllNumbers = false,
  customTypes = [],
}: JsToAquaArg): string => {
  const moduleName = toAquaType(fileName);

  if (moduleName instanceof Error) {
    return commandObj.error(
      `file name must start with a letter. Got: ${color.yellow(fileName)}`,
    );
  }

  const customTypesWithAquaNames = customTypes.map((v) => {
    return { ...v, name: toAquaType(v.name) };
  });

  const customTypeErrors = customTypesWithAquaNames.filter(
    (v): v is { name: Error; properties: Array<string> } => {
      return v.name instanceof Error;
    },
  );

  if (customTypeErrors.length > 0) {
    return commandObj.error(customTypeErrors.join("\n\n"));
  }

  const sortedCustomTypes = customTypesWithAquaNames.map(
    ({ properties, name }) => {
      assert(typeof name === "string", "Checked for errors above");
      return { properties: JSON.stringify(properties.sort()), name };
    },
  );

  const { type, value, typeDefs } = jsToAquaImpl({
    fieldName: moduleName,
    nestingLevel: 1,
    currentNesting: "",
    level: "top",
    valueToConvert,
    useF64ForAllNumbers,
    sortedCustomTypes,
  });

  return `aqua ${moduleName} declares *\n\n${
    typeDefs === undefined ? "" : `${dedupeTypeDefs(typeDefs)}\n\n`
  }func get() -> ${type}:\n    <- ${value}\n`;
};

const NIL = { type: "?u8", value: "nil" } as const;

const NUMBER_TYPES = ["u64", "i64", "f64"] as const;

const INDENTATION = " ".repeat(4);

type JsToAquaImplArg = {
  valueToConvert: unknown;
  fieldName: string;
  currentNesting: string;
  useF64ForAllNumbers: boolean;
  nestingLevel: number;
  sortedCustomTypes: Array<{ name: string; properties: string }>;
  /**
   * "top" - is a top level type returned from the get() function of the module
   * "second" - are all the types of objects that are direct children of the top level type. Their names are not prefixed
   * "rest" - all the types. Their names are prefixed with parent type names
   */
  level: "top" | "second" | "rest";
};

export const jsToAquaImpl = ({
  valueToConvert,
  fieldName,
  currentNesting,
  useF64ForAllNumbers,
  nestingLevel,
  sortedCustomTypes,
  level,
}: JsToAquaImplArg): {
  type: string;
  value: string;
  typeDefs?: string | undefined;
} => {
  const error = (message: string) => {
    return commandObj.error(
      `Failed converting to aqua. ${message}. At ${color.yellow(
        currentNesting === "" ? "" : `${currentNesting}.`,
      )}${color.yellow(fieldName)}: ${stringifyUnknown(valueToConvert)}`,
    );
  };

  if (typeof valueToConvert === "string") {
    return { type: "string", value: `"${valueToConvert}"` };
  }

  if (typeof valueToConvert === "number") {
    const isInteger = Number.isInteger(valueToConvert);

    const type = (() => {
      if (useF64ForAllNumbers || !isInteger) {
        return "f64";
      }

      if (valueToConvert < 0) {
        return "i64";
      }

      return "u64";
    })();

    const stringNumber = numToStr(valueToConvert);

    const value =
      type === "f64" && isInteger ? `${stringNumber}.0` : stringNumber;

    return { type, value };
  }

  if (typeof valueToConvert === "boolean") {
    return { type: "bool", value: boolToStr(valueToConvert) };
  }

  if (isNilInAqua(valueToConvert)) {
    return NIL;
  }

  const newNestingLevel = nestingLevel + 1;
  const prevIndent = INDENTATION.repeat(nestingLevel);
  const newIndent = INDENTATION.repeat(newNestingLevel);

  if (Array.isArray(valueToConvert)) {
    const mappedToAqua = valueToConvert.map((valueToConvert) => {
      return jsToAquaImpl({
        nestingLevel: newNestingLevel,
        valueToConvert,
        fieldName,
        currentNesting,
        useF64ForAllNumbers,
        sortedCustomTypes,
        level,
      });
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

  if (typeof valueToConvert === "object") {
    assert(
      valueToConvert !== null,
      "we checked v is not null with isNilInAqua",
    );

    const newName = toAquaType(fieldName);

    if (newName instanceof Error) {
      return error(
        `Name must start with a letter. Got: ${color.yellow(newName)}`,
      );
    }

    // Check "top" level type name is not clashing with the "second" level
    if (level === "second" && newName === currentNesting) {
      return error(
        `Either rename your file so it is not called as your top-level object property ${color.yellow(
          newName,
        )} or pass a custom type name to be used instead`,
      );
    }

    const objectEntries: [string, unknown][] = Object.entries(valueToConvert);
    const objectProperties = JSON.stringify(Object.keys(valueToConvert).sort());

    const { name: type } = sortedCustomTypes.find(({ properties }) => {
      return properties === objectProperties;
    }) ?? {
      // Don't nest type names for top-level and direct child types
      name: level === "rest" ? `${currentNesting}${newName}` : newName,
    };

    if (OPTIONAL in valueToConvert) {
      const { type, value, typeDefs } = jsToAquaImpl({
        valueToConvert: valueToConvert[OPTIONAL],
        fieldName,
        currentNesting,
        useF64ForAllNumbers,
        nestingLevel,
        sortedCustomTypes,
        level,
      });

      return {
        type: `?${type}`,
        value:
          IS_NIL in valueToConvert && valueToConvert[IS_NIL] === true
            ? NIL.value
            : `?[${value}]`,
        typeDefs,
      };
    }

    const { keyTypes, keyDataTypes, entries } = objectEntries.reduce<{
      keyTypes: string[];
      keyDataTypes: string[];
      entries: string[];
    }>(
      ({ keyTypes, keyDataTypes, entries }, [fieldName, valueToConvert]) => {
        const {
          type: innerType,
          value,
          typeDefs,
        } = jsToAquaImpl({
          currentNesting: type,
          nestingLevel: newNestingLevel,
          // each time we nest objects - the level changes:
          // "top" -> "second" -> "rest"
          level: level === "top" ? "second" : "rest",
          valueToConvert,
          fieldName,
          useF64ForAllNumbers,
          sortedCustomTypes,
        });

        const camelCasedKey = camelCase(fieldName);
        const keyValidity = validateAquaName(camelCasedKey);

        if (typeof keyValidity === "string") {
          return error(`Invalid key ${color.yellow(fieldName)} ${keyValidity}`);
        }

        return {
          keyTypes: [...keyTypes, `    ${camelCasedKey}: ${innerType}`],
          keyDataTypes:
            typeDefs === undefined ? keyDataTypes : [...keyDataTypes, typeDefs],
          entries: [...entries, `\n${newIndent}${camelCasedKey}=${value}`],
        };
      },
      { keyTypes: [], keyDataTypes: [], entries: [] },
    );

    return {
      type,
      value: `${type}(${entries.join(",")}\n${INDENTATION.repeat(
        nestingLevel,
      )})`,
      typeDefs: `${
        keyDataTypes.length === 0
          ? ""
          : `${keyDataTypes.sort().join("\n\n")}\n\n`
      }data ${type}:\n${keyTypes.sort().join("\n")}`,
    };
  }

  return error(`Unsupported type: ${typeof valueToConvert}`);
};

export type CustomTypes = Array<{ name: string; properties: Array<string> }>;

const customTypesSchema: JSONSchemaType<CustomTypes> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      properties: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["name", "properties"],
  },
};

const customTypesValidator = ajv.compile(customTypesSchema);

export async function fileToAqua(
  inputPathArg: string | undefined,
  outputDirPathArg: string | undefined,
  useF64ForAllNumbers: boolean,
  customTypesPath: string | undefined,
  parseFn: (content: string) => unknown,
) {
  let customTypes: CustomTypes = [];

  if (customTypesPath !== undefined) {
    const content = await readFile(customTypesPath, FS_OPTIONS);
    const parsedContent = parseFn(content);

    if (!customTypesValidator(parsedContent)) {
      return commandObj.error(
        `Invalid custom types file ${color.yellow(
          customTypesPath,
        )}: ${await validationErrorToString(customTypesValidator.errors)}`,
      );
    }

    customTypes = parsedContent;
  }

  const inputPath =
    inputPathArg ?? (await input({ message: "Enter path to input file" }));

  const content = await readFile(inputPath, FS_OPTIONS);
  const valueToConvert = parseFn(content);

  const inputPathDir = dirname(inputPath);
  const fileName = parse(inputPath).name;
  const fileNameWithExt = `${fileName}.${AQUA_EXT}`;
  let outputPath = join(inputPathDir, fileNameWithExt);

  if (typeof outputDirPathArg === "string") {
    await mkdir(outputDirPathArg, { recursive: true });
    outputPath = join(outputDirPathArg, fileNameWithExt);
  }

  const aqua = jsToAqua({
    valueToConvert,
    fileName,
    useF64ForAllNumbers,
    customTypes,
  });

  await writeFile(outputPath, aqua, FS_OPTIONS);
  commandObj.logToStderr(`Created aqua file at ${color.yellow(outputPath)}`);
}
