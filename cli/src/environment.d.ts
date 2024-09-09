/**
 * Copyright 2024 Fluence DAO
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

import {
  DEBUG_COUNTLY,
  FLUENCE_ENV,
  FLUENCE_USER_DIR,
  CI,
} from "../src/lib/setupEnvironment.js";

import { ChainENV } from "./common.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [FLUENCE_ENV]: ChainENV;
      [DEBUG_COUNTLY]: "true" | "false";
      [FLUENCE_USER_DIR]?: string;
      [CI]: "true" | "false";
      PATH: string;
    }
  }
}
