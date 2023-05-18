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

import { jsToAquaImpl, makeOptional } from "../src/lib/helpers/jsToAqua.js";

const WRAPPER_FUNCTION_NAME = "res";

const obj = [
  [1, 2, 3],
  [1, -2, 3],
  [1.1, 2, 3],
  [["1"], ["2"], ["3"]],
  { a: -1, b: 2.2 },
  { a: { b: [2] }, c: null, d: [], e: [{ f: "4" }, { f: "5" }] },
  {
    a: makeOptional(undefined, 1),
    b: makeOptional(null, 2.2),
    e: makeOptional([{ f: "4" }, { f: "5" }], [{ f: "5" }]),
  },
] as const;

describe("Conversion from js to aqua", () => {
  test.each`
    js           | value       | type        | typeDefs
    ${"abc"}     | ${'"abc"'}  | ${"string"} | ${undefined}
    ${true}      | ${"true"}   | ${"bool"}   | ${undefined}
    ${false}     | ${"false"}  | ${"bool"}   | ${undefined}
    ${null}      | ${"nil"}    | ${"?u8"}    | ${undefined}
    ${undefined} | ${"nil"}    | ${"?u8"}    | ${undefined}
    ${[]}        | ${"nil"}    | ${"?u8"}    | ${undefined}
    ${{}}        | ${"nil"}    | ${"?u8"}    | ${undefined}
    ${1}         | ${"1"}      | ${"u64"}    | ${undefined}
    ${-1}        | ${"-1"}     | ${"i64"}    | ${undefined}
    ${1.234}     | ${"1.234"}  | ${"f64"}    | ${undefined}
    ${-1.234}    | ${"-1.234"} | ${"f64"}    | ${undefined}
  `(
    "js: $js. value: $value. type: $type. typeDefs: $typeDefs",
    ({ js, value, type, typeDefs }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const res = jsToAquaImpl(js, WRAPPER_FUNCTION_NAME, "");

      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      expect(res.value).toStrictEqual(value);
      expect(res.type).toStrictEqual(type);
      expect(res.typeDefs).toStrictEqual(typeDefs);
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    }
  );

  test("Expect objects to match snapshot", () => {
    obj.forEach((o) => {
      expect(jsToAquaImpl(o, WRAPPER_FUNCTION_NAME, "")).toMatchSnapshot();
    });
  });

  test("array with different element types throws an error", () => {
    expect(() => {
      jsToAquaImpl([1, "2", true], WRAPPER_FUNCTION_NAME, "");
    }).toThrowError();
  });

  test("array with the objects that contain numbers with the same element types doesn't throw an error", () => {
    expect(() => {
      jsToAquaImpl([{ n: 1 }, { n: 2 }], WRAPPER_FUNCTION_NAME, "");
    }).not.toThrowError();
  });

  test("array with the objects that contain numbers with different element types throws an error", () => {
    expect(() => {
      jsToAquaImpl([{ n: -1 }, { n: 1.1 }], WRAPPER_FUNCTION_NAME, "");
    }).toThrowError();
  });

  test("array with the objects that contain numbers with different element types, but with a f64 flag doesn't throw", () => {
    expect(() => {
      jsToAquaImpl([{ n: -1 }, { n: 1 }], WRAPPER_FUNCTION_NAME, "", true);
    }).not.toThrowError();
  });
});
