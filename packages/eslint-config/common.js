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
