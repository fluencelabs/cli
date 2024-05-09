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

import Ajv, { type JSONSchemaType } from "ajv";

import { ajvOptions } from "./ajvOptions.js";

type GetSpellLogsReturnType = [
  {
    logs: {
      message: string;
      timestamp: number;
    }[];
    worker_id: string;
  }[],
  string[],
];

const getSpellLogsReturnSchema: JSONSchemaType<GetSpellLogsReturnType> = {
  type: "array",
  items: [
    {
      type: "array",
      items: {
        type: "object",
        properties: {
          logs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                message: { type: "string" },
                timestamp: { type: "integer" },
              },
              required: ["message", "timestamp"],
            },
          },
          worker_id: { type: "string" },
        },
        required: ["logs", "worker_id"],
      },
    },
    { type: "array", items: { type: "string" } },
  ],
  minItems: 2,
  maxItems: 2,
};

export const validateSpellLogs = new Ajv.default(ajvOptions).compile(
  getSpellLogsReturnSchema,
);
