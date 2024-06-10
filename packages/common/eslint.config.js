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

// @ts-check

import { dirname, join } from "path";
import { fileURLToPath } from "url";

import repoEslintConfigCommon from "@repo/eslint-config/common.js";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  ...repoEslintConfigCommon,
  {
    languageOptions: {
      parserOptions: {
        project: [join(__dirname, "tsconfig.json")],
      },
    },
  },
  {
    ignores: ["dist/**", "eslint.config.js"],
  },
);