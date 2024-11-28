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

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CodegenConfig } from "@graphql-codegen/cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  schema: join(__dirname, "gqlSchema.json"),
  documents: join(__dirname, "schema.graphql"),
  generates: {
    [join(__dirname, "gqlGenerated.ts")]: {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-graphql-request",
      ],
      config: {
        /**
         * Fail if there are unknown scalars (that are mapped to `any` type)
         */
        strictScalars: true,
        /**
         * The Graph custom scalars
         */
        scalars: {
          BigInt: "string",
          BigDecimal: "string",
          Bytes: "string",
          Int8: "number",
          Timestamp: "number",
        },
        /**
         * This makes import look like `import { gql } from "graphql-tag"`
         * and not `import gql from "graphql-tag"`, fixing "This expression is not callable"
         */
        gqlImport: "graphql-tag#gql",
        /**
         * Import types with `import type { ... }`
         */
        useTypeImports: true,
        emitLegacyCommonJSImports: false,
        enumsAsTypes: true,
      },
    },
  },
} satisfies CodegenConfig;
