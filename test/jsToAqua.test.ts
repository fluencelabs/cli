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

import { jsToAquaImpl } from "../src/lib/helpers/jsToAqua.js";

const WRAPPER_FUNCTION_NAME = "res";
const RETURN_TYPE = "Res";

const obj = [
  {
    js: { a: -1, b: 2.2 },
    value: `${RETURN_TYPE}(a=-1,b=2.2)`,
    type: RETURN_TYPE,
    typeDefs: `data Res:
    a: i64
    b: f64`,
  },
  {
    js: { a: { b: [2] }, c: null, d: [], e: [{ f: "4" }, { f: "5" }] },
    value: `${RETURN_TYPE}(a=${RETURN_TYPE}A(b=[2]),c=nil,d=nil,e=[${RETURN_TYPE}E(f="4"),${RETURN_TYPE}E(f="5")])`,
    type: RETURN_TYPE,
    typeDefs: `data ResA:
    b: []u64

data ResE:
    f: string

data Res:
    a: ResA
    c: ?u8
    d: ?u8
    e: []ResE`,
  },
] as const;

describe("Conversion from js to aqua", () => {
  test.each`
    js                       | value                    | type            | typeDefs
    ${"abc"}                 | ${'"abc"'}               | ${"string"}     | ${undefined}
    ${true}                  | ${"true"}                | ${"bool"}       | ${undefined}
    ${false}                 | ${"false"}               | ${"bool"}       | ${undefined}
    ${null}                  | ${"nil"}                 | ${"?u8"}        | ${undefined}
    ${undefined}             | ${"nil"}                 | ${"?u8"}        | ${undefined}
    ${[]}                    | ${"nil"}                 | ${"?u8"}        | ${undefined}
    ${{}}                    | ${"nil"}                 | ${"?u8"}        | ${undefined}
    ${1}                     | ${"1"}                   | ${"u64"}        | ${undefined}
    ${-1}                    | ${"-1"}                  | ${"i64"}        | ${undefined}
    ${1.234}                 | ${"1.234"}               | ${"f64"}        | ${undefined}
    ${-1.234}                | ${"-1.234"}              | ${"f64"}        | ${undefined}
    ${[1, 2, 3]}             | ${"[1,2,3]"}             | ${"[]u64"}      | ${undefined}
    ${[1, -2, 3]}            | ${"[1,-2,3]"}            | ${"[]i64"}      | ${undefined}
    ${[1.1, 2, 3]}           | ${"[1.1,2,3]"}           | ${"[]f64"}      | ${undefined}
    ${[["1"], ["2"], ["3"]]} | ${'[["1"],["2"],["3"]]'} | ${"[][]string"} | ${undefined}
    ${obj[0].js}             | ${obj[0].value}          | ${obj[0].type}  | ${obj[0].typeDefs}
    ${obj[1].js}             | ${obj[1].value}          | ${obj[1].type}  | ${obj[1].typeDefs}
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
