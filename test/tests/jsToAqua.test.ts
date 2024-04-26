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

import camelCase from "lodash-es/camelCase.js";
import { describe, expect, test } from "vitest";

import {
  jsToAqua,
  jsToAquaImpl,
  makeOptional,
} from "../../src/lib/helpers/jsToAqua.js";
import { jsonStringify } from "../../src/lib/helpers/utils.js";

const fileName = "someModule";

describe("Conversion from js to aqua", () => {
  test.each`
    js                      | value       | type
    ${"abc"}                | ${'"abc"'}  | ${"string"}
    ${true}                 | ${"true"}   | ${"bool"}
    ${false}                | ${"false"}  | ${"bool"}
    ${null}                 | ${"nil"}    | ${"?u8"}
    ${undefined}            | ${"nil"}    | ${"?u8"}
    ${[]}                   | ${"nil"}    | ${"?u8"}
    ${{}}                   | ${"nil"}    | ${"?u8"}
    ${1}                    | ${"1"}      | ${"u64"}
    ${-1}                   | ${"-1"}     | ${"i64"}
    ${1.234}                | ${"1.234"}  | ${"f64"}
    ${-1.234}               | ${"-1.234"} | ${"f64"}
    ${makeOptional(1, 1)}   | ${"?[1]"}   | ${"?u64"}
    ${makeOptional("", "")} | ${'?[""]'}  | ${"?string"}
  `("jsToAqua returns $value and $type for $js", (arg: unknown) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const { js, value, type } = arg as {
      js: string;
      value: string;
      type: string;
      typeDefs: string | undefined;
    };

    const valueToConvert: unknown = js;

    const res = jsToAquaImpl({
      valueToConvert,
      currentNesting: "",
      fieldName: fileName,
      level: "top",
      sortedCustomTypes: [],
      useF64ForAllNumbers: false,
      nestingLevel: 1,
    });

    expect(res.value).toStrictEqual(value);
    expect(res.type).toStrictEqual(type);
    expect(res.typeDefs).toStrictEqual(undefined);
  });

  [
    1,
    makeOptional(1, 1),
    [1, 2, 3],
    [1, -2, 3],
    [1.1, 2, 3],
    [["1"], ["2"], ["3"]],
    {
      a: { a: [2] },
      b: { a: -1, b: 2.2 },
      c: [{ a: "4" }, { a: "5" }],
    },
    {
      a: null,
      b: [],
      c: undefined,
      d: {},
    },
    {
      a: makeOptional(undefined, 1),
      b: makeOptional(null, 1.1),
      c: makeOptional([{ f: "4" }, { f: "5" }], [{ f: "5" }]),
      d: makeOptional(undefined, [{ f: "5" }]),
    },
  ].forEach((valueToConvert) => {
    test(`Expect test case to match snapshot ${jsonStringify(valueToConvert)}`, () => {
      expect(jsToAqua({ fileName, valueToConvert })).toMatchSnapshot();
    });
  });

  test(`Expect custom type to work`, () => {
    expect(
      jsToAqua({
        fileName,
        valueToConvert: {
          a: 1,
          b: { a: 1 },
          c: [{ e: { s: 1 } }],
          d: [{ e: { s: 2 } }],
        },
        customTypes: [
          { name: "Works", properties: ["a", "b", "c"] },
          { name: "Nested", properties: ["a"] },
          { name: "InsideArray", properties: ["e"] },
        ],
      }),
    ).toMatchSnapshot();
  });

  test("array with different element types throws an error", () => {
    expect(() => {
      jsToAqua({ valueToConvert: [1, "2", true], fileName });
    }).toThrowError();
  });

  test("array with the objects that contain numbers with the same element types doesn't throw an error", () => {
    expect(() => {
      jsToAqua({ valueToConvert: [{ n: 1 }, { n: 2 }], fileName });
    }).not.toThrowError();
  });

  test("array with the objects that contain numbers with different element types throws an error", () => {
    expect(() => {
      jsToAqua({ valueToConvert: [{ n: -1 }, { n: 1.1 }], fileName });
    }).toThrowError();
  });

  test("array with the objects that contain numbers with different element types, but with a f64 flag doesn't throw", () => {
    expect(() => {
      jsToAqua({
        valueToConvert: [{ n: -1 }, { n: 1 }],
        fileName,
        useF64ForAllNumbers: true,
      });
    }).not.toThrowError();
  });

  test(`object that contains fileName '${fileName}' as the top-level property to throw`, () => {
    expect(() => {
      jsToAqua({ valueToConvert: { [fileName]: { a: 1 } }, fileName });
    }).toThrowError();

    expect(() => {
      jsToAqua({
        valueToConvert: { [camelCase(fileName)]: { a: 1 } },
        fileName,
      });
    }).toThrowError();

    expect(() => {
      jsToAqua({
        valueToConvert: [{ [camelCase(fileName)]: [{ a: 1 }] }],
        fileName,
      });
    }).toThrowError();
  });
});
