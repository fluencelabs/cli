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

export type WorkerServices = {
  host_id: string;
  services: string[];
  spells: string[];
  worker_id: string;
}[];

export const workerServiceSchema: JSONSchemaType<WorkerServices> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      host_id: { type: "string" },
      services: {
        type: "array",
        items: { type: "string" },
      },
      spells: {
        type: "array",
        items: { type: "string" },
      },
      worker_id: { type: "string" },
    },
    required: ["host_id", "services", "spells", "worker_id"],
  },
};

export const validateWorkerServices = new Ajv.default(ajvOptions).compile(
  workerServiceSchema,
);
