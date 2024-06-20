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

import { validationErrorToString } from "../../src/lib/ajvInstance.js";
import { UPDATED_SPELL_MESSAGE } from "../helpers/constants.js";
import { GET_SPELL_LOGS_FUNCTION_NAME } from "../helpers/constants.js";

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

const validateSpellLogsStructure = new Ajv.default(ajvOptions).compile(
  getSpellLogsReturnSchema,
);

export async function validateSpellLogs(res: unknown) {
  if (!validateSpellLogsStructure(res)) {
    throw new Error(
      `result of running ${GET_SPELL_LOGS_FUNCTION_NAME} aqua function has unexpected structure: ${await validationErrorToString(validateSpellLogsStructure.errors)}`,
    );
  }

  const [logsFromAquaScript, errorsFromAquaScript] = res;

  const errors = logsFromAquaScript.flatMap((w) => {
    if (w.logs.length === 0) {
      return [`Worker ${w.worker_id} doesn't have any logs`];
    }

    const lastLogMessage = w.logs[w.logs.length - 1]?.message;

    if (lastLogMessage !== UPDATED_SPELL_MESSAGE) {
      return [
        `Worker ${w.worker_id} last log message is expected to be ${UPDATED_SPELL_MESSAGE}, but it is ${lastLogMessage === undefined ? "undefined" : lastLogMessage}`,
      ];
    }

    return [];
  });

  if (errorsFromAquaScript.length > 0) {
    errors.push(`Aqua script returned errors: ${errors.join("\n")}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}
