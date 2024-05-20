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

interface Log {
  message: string;
  timestamp: number;
}

interface Worker {
  logs: Log[];
  worker_id: string;
}

type WorkersArray = Worker[];
type ErrorArray = string[];
type DataStructure = [WorkersArray, ErrorArray];

const logSchema: JSONSchemaType<Log> = {
  type: "object",
  properties: {
    message: { type: "string", pattern: '^".*"$' },
    timestamp: { type: "integer" },
  },
  required: ["message", "timestamp"],
};

const workerSchema: JSONSchemaType<Worker> = {
  type: "object",
  properties: {
    logs: { type: "array", items: logSchema },
    worker_id: { type: "string" },
  },
  required: ["logs", "worker_id"],
};

const dataStructureSchema: JSONSchemaType<DataStructure> = {
  type: "array",
  items: [
    { type: "array", items: workerSchema },
    { type: "array", items: { type: "string" } },
  ],
  minItems: 2,
  maxItems: 2,
};

export const validateSpellLogs = new Ajv.default(ajvOptions).compile(
  dataStructureSchema,
);
