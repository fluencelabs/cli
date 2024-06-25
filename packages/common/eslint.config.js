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
