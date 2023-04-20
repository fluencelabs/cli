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

import { TEMPLATES } from "../src/lib/const.js";

import "../src/lib/setupEnvironment.js";
import { fluence, initFirstTime } from "./helpers.js";

(async (): Promise<void> => {
  console.log("Setting up tests...");

  await Promise.all([
    fluence({
      args: ["dep", "i"],
    }),
    ...TEMPLATES.map((template) => {
      return initFirstTime(template);
    }),
  ]);

  console.log("Tests are ready to run!");
})().catch((error) => {
  throw error;
});
