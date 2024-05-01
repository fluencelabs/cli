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

import { RUN_TESTS_IN_PARALLEL } from "./dist/lib/setupEnvironment.js";

/** @type {import("ts-jest").JestConfigWithTsJest} */
export default {
  maxConcurrency: 1, // increasing number of concurrent tests leads to a problem with nonce
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  maxWorkers: process.env[RUN_TESTS_IN_PARALLEL] === "false" ? 1 : 5,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testPathIgnorePatterns: ["^dist"],
  testEnvironment: "node",
  testTimeout: 1000 * 60 * 10, // 10 minutes in milliseconds
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "test/tsconfig.json",
      },
    ],
  },
};
