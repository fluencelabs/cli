/**
 * Copyright 2023 Fluence Labs Limited
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

const ajvOptions = {
  code: { esm: true },
};

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

export type DeployedServicesAnswer = {
  answer: string;
  worker: {
    host_id: string;
    pat_id: string;
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
            pat_id: { type: "string" },
            worker_id: { type: "string" },
          },
          required: ["host_id", "pat_id", "worker_id"],
        },
      },
      required: ["worker"],
    },
  };

export const validateDeployedServicesAnswerSchema = new Ajv.default(
  ajvOptions,
).compile(deployedServicesAnswerSchema);
