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
import { access, cp, rm } from "node:fs/promises";
import { arch, platform } from "node:os";
import { join } from "node:path";

import {
  krasnodar,
  stage,
  testNet,
} from "@fluencelabs/fluence-network-environment";

import {
  CLI_NAME,
  type Template,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
  // FLUENCE_CONFIG_FULL_FILE_NAME,
  // FS_OPTIONS,
  // IPFS_ADDR_PROPERTY,
} from "../src/lib/const.js";
import { execPromise, type ExecPromiseArg } from "../src/lib/execPromise.js";
import { jsonStringify } from "../src/lib/helpers/utils.js";
import { local } from "../src/lib/multiaddres.js";
import { getDefaultJSDirPath, getDefaultTSDirPath } from "../src/lib/paths.js";
import {
  FLUENCE_ENV,
  RUN_TESTS_IN_PARALLEL,
} from "../src/lib/setupEnvironment.js";
import { assertHasKey } from "../src/lib/typeHelpers.js";

// const TEST_IPFS_ADDR = "/ip4/127.0.0.1/tcp/5001";

export const fluenceEnv = process.env[FLUENCE_ENV];

export const multiaddrs = {
  kras: krasnodar,
  stage: stage,
  testnet: testNet,
  local,
}[fluenceEnv];

type CliArg = {
  args?: ExecPromiseArg["args"];
  flags?: ExecPromiseArg["flags"];
  cwd?: string;
  timeout?: number;
};

const pathToBinDir = join(
  process.cwd(),
  join("tmp", `${platform()}-${arch()}`, CLI_NAME, "bin"),
);

const pathToCliRunJS = join(pathToBinDir, "run.js");
const pathToNodeJS = join(pathToBinDir, "node");

export const fluence = async ({
  args = [],
  flags,
  cwd = process.cwd(),
  timeout = 1000 * 60 * 4, // 4 minutes,
}: CliArg): ReturnType<typeof execPromise> => {
  let res: string;

  try {
    res = await execPromise({
      command: pathToNodeJS,
      args: ["--no-warnings", pathToCliRunJS, ...args],
      flags: {
        "no-input": true,
        ...flags,
      },
      options: { cwd },
      printOutput: true,
      timeout,
    });
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        // CHECK THE STACK TRACE BELOW TO SEE THE ERROR ORIGIN
        err.message,
      );
    }

    throw err;
  }

  return res;
};

const getInitializedTemplatePath = (template: Template) => {
  return join("tmp", "templates", template);
};

export const initFirstTime = async (template: Template) => {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await access(templatePath);
  } catch {
    await fluence({
      args: ["init", templatePath],
      flags: { template, env: fluenceEnv, "no-input": true },
    });

    if (template === "js" || template === "ts") {
      const cwd =
        template === "js"
          ? getDefaultJSDirPath(templatePath)
          : getDefaultTSDirPath(templatePath);

      await execPromise({
        command: "npm",
        args: ["install"],
        options: { cwd },
      });
    }
  }

  // const projectConfigPath = join(templatePath, FLUENCE_CONFIG_FULL_FILE_NAME);
  // const projectConfigContent = await readFile(projectConfigPath, FS_OPTIONS);

  // await writeFile(
  //   projectConfigPath,
  //   `${projectConfigContent}\n${IPFS_ADDR_PROPERTY}: ${TEST_IPFS_ADDR}`,
  // );

  // eslint-disable-next-line no-console
  console.log(`Initialized template "${template}"`);
  return templatePath;
};

const generateDefaultKey = (cwd: string) => {
  return fluence({
    args: ["key", "new", "default"],
    flags: {
      default: true,
    },
    cwd,
  });
};

export const init = async (cwd: string, template: Template): Promise<void> => {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await rm(cwd, { recursive: true });
  } catch {}

  await cp(templatePath, cwd, { recursive: true });
  await generateDefaultKey(cwd);
};

export const maybeConcurrentTest = (...args: Parameters<typeof test>): void => {
  if (process.env[RUN_TESTS_IN_PARALLEL] === "false") {
    test(...args);
    return;
  }

  test.concurrent(...args);
};

export const sleepSeconds = (s: number) => {
  return new Promise<void>((resolve) => {
    return setTimeout(resolve, s * 1000);
  });
};

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

export const assertHasWorkerAndAnswer = (
  result: unknown,
): {
  worker: { host_id: string; worker_id: string | null; pat_id: string };
  answer: string | null;
} => {
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

    return { worker: { host_id, worker_id, pat_id }, answer };
  } catch (err) {
    throw new Error(
      `Running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is supposed to return an array of objects of a particular shape: { worker: { host_id: string, worker_id: string | null, pat_id: string }, answer: string | null }. One of the received objects doesn't match the shape: ${jsonStringify(
        result,
      )}. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};
