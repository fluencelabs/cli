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

import "@total-typescript/ts-reset";
import assert from "node:assert";

import { RUN_DEPLOYED_SERVICES_FUNCTION_CALL } from "../src/lib/const.js";
import { jsonStringify } from "../src/lib/helpers/utils.js";
import { assertHasKey } from "../src/lib/typeHelpers.js";

// TODO: delete this file
console.log("\nHelpers setup...");

export const sortPeers = <T extends { peer: string }>(
  { peer: peerA }: T,
  { peer: peerB }: T,
) => {
  if (peerA < peerB) {
    return -1;
  }

  if (peerA > peerB) {
    return 1;
  }

  return 0;
};

export const assertHasPeer = (result: unknown): { peer: string } => {
  try {
    assertHasKey("peer", result);
    assert(typeof result.peer === "string");
    return { ...result, peer: result.peer };
  } catch (err) {
    throw new Error(
      `Running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is supposed to return an array of objects of a particular shape: { peer: string }. One of the received objects doesn't match the shape: ${jsonStringify(
        result,
      )}. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

export const assertHasWorkerAndAnswer = (result: unknown) => {
  try {
    assertHasKey("worker", result);
    assertHasKey("answer", result);
    const { worker, answer } = result;
    assert(typeof answer === "string" || answer === null);
    assertHasKey("host_id", worker);
    assertHasKey("worker_id", worker);
    assertHasKey("pat_id", worker);
    const { host_id, worker_id, pat_id } = worker;
    assert(typeof host_id === "string");
    assert(typeof worker_id === "string" || worker_id === null);
    assert(typeof pat_id === "string");
  } catch (err) {
    throw new Error(
      `Running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is supposed to return an array of objects of a particular shape: { worker: { host_id: string, worker_id: string | null, pat_id: string }, answer: string | null }. One of the received objects doesn't match the shape: ${jsonStringify(
        result,
      )}. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};
