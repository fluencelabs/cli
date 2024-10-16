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

import Ajv, { type JSONSchemaType } from "ajv";

import { ajvOptions } from "./ajvOptions.js";

export type DeployedServicesAnswer = {
  answer: string;
  worker: {
    host_id: string;
    cu_ids: string[];
    worker_id: string;
  };
}[];

export const deployedServicesAnswerSchema: JSONSchemaType<DeployedServicesAnswer> =
  {
    type: "array",
    items: {
      type: "object",
      properties: {
        answer: { type: "string" },
        worker: {
          type: "object",
          properties: {
            host_id: { type: "string" },
            cu_ids: {
              type: "array",
              items: { type: "string" },
            },
            worker_id: { type: "string" },
          },
          required: ["host_id", "cu_ids", "worker_id"],
        },
      },
      required: ["worker"],
    },
  };

export const validateDeployedServicesAnswer: Ajv.ValidateFunction<DeployedServicesAnswer> =
  new Ajv.default(ajvOptions).compile(deployedServicesAnswerSchema);
