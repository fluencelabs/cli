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

import eslintConfigPrettier from "eslint-config-prettier";
import * as eslintPluginImport from "eslint-plugin-import";
import eslintPluginLicenseHeader from "eslint-plugin-license-header";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      "license-header": eslintPluginLicenseHeader,
      "unused-imports": eslintPluginUnusedImports,
      import: eslintPluginImport,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='toString']",
          message:
            // cause when the variable changes type you will have no way to learn you possibly have to change it's string representation
            "Please use type-safe to string converter (e.g. numToString)",
        },
        {
          selector: "Identifier[name='String']",
          message:
            // cause when the variable changes type you will have no way to learn you possibly have to change it's string representation
            "Please use type-safe to string converter (e.g. numToString)",
        },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["error"],
      "arrow-body-style": ["error", "always"],
      "no-empty": [
        "error",
        {
          allowEmptyCatch: true,
        },
      ],
      "operator-assignment": ["error", "never"],
      "no-unused-expressions": ["error"],
      "dot-notation": ["off"],
      "object-curly-spacing": ["error", "always"],
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "multiline-expression",
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "multiline-expression",
        },
        {
          blankLine: "always",
          prev: "multiline-block-like",
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "multiline-block-like",
        },
        {
          blankLine: "always",
          prev: "multiline-const",
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "multiline-const",
        },
        {
          blankLine: "always",
          prev: "multiline-let",
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "multiline-let",
        },
        {
          blankLine: "any",
          prev: "case",
          next: "case",
        },
      ],
      "license-header/header": ["error", join(__dirname, "license-header.js")],
      "unused-imports/no-unused-imports": "error",
      "import/no-unresolved": "off",
      "import/no-cycle": ["error"],
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "no-public",
        },
      ],
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never",
        },
      ],
      curly: ["error", "all"],
    },
  },
  {
    files: ["test/**/*.js", "test/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  eslintConfigPrettier,
);
