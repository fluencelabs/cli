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
import { access, cp, readFile, rm, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { join } from "node:path";

import {
  krasnodar,
  type Node,
  stage,
  testNet,
} from "@fluencelabs/fluence-network-environment";
import { CustomColors } from "@oclif/color";
import lockfile from "proper-lockfile";

import {
  CLI_NAME,
  LOCAL_NET_WALLET_KEYS,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
  type Template,
} from "../src/lib/const.js";
import { execPromise, type ExecPromiseArg } from "../src/lib/execPromise.js";
import { flagsToArgs, jsonStringify } from "../src/lib/helpers/utils.js";
import { addrsToNodes } from "../src/lib/multiaddres.js";
import {
  FLUENCE_ENV,
  RUN_TESTS_IN_PARALLEL,
} from "../src/lib/setupEnvironment.js";
import { assertHasKey } from "../src/lib/typeHelpers.js";

export const fluenceEnv = process.env[FLUENCE_ENV];
export const DEFAULT_UNIQUE_PRIVATE_KEY = await getUniquePrivateKey();

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

  args = ["--no-warnings", pathToCliRunJS, ...args];

  flags = {
    "no-input": true,
    ...flags,
  };

  console.log(
    CustomColors.addon(
      `${cwd} % ${pathToNodeJS} ${args.join(" ")} ${flagsToArgs(flags).join(
        " ",
      )}`,
    ),
  );

  try {
    res = await execPromise({
      command: pathToNodeJS,
      args,
      flags,
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
  }

  return templatePath;
};

export const init = async (cwd: string, template: Template): Promise<void> => {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await rm(cwd, { recursive: true });
  } catch {}

  await cp(templatePath, cwd, { recursive: true });
};

export const maybeConcurrentTest = (...args: Parameters<typeof test>): void => {
  console.log(
    `Running "${args[0]}" with private key: ${DEFAULT_UNIQUE_PRIVATE_KEY}`,
  );

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

export const pathToTheTemplateWhereLocalEnvironmentIsSpunUp = join(
  "tmp",
  "templates",
  "quickstart",
);

export const NO_PROJECT_TEST_NAME = "shouldWorkWithoutProject";

let multiaddrs: Node[] | undefined;

export async function getMultiaddrs() {
  const local =
    fluenceEnv === "local"
      ? multiaddrs === undefined
        ? addrsToNodes(
            (
              await fluence({
                args: ["default", "peers", "local"],
                cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
              })
            )
              .trim()
              .split("\n"),
          )
        : multiaddrs
      : [];

  return {
    kras: krasnodar,
    stage: stage,
    testnet: testNet,
    local,
  }[fluenceEnv];
}

async function processFile(
  filePath: string,
  processDataFunction: (data: string) => number,
): Promise<number> {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, "");
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const release = await lockfile.lock(filePath, {
      retries: {
        retries: 30,
        minTimeout: 100,
        maxTimeout: 500,
      },
    });

    try {
      const data = await readFile(filePath, "utf-8");
      const processedData = processDataFunction(data);
      await writeFile(filePath, processedData.toString());

      return processedData;
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await release();
    }
  } catch (error) {
    console.error("Error during working with a file:", error);
    throw error;
  }
}

function processData(data: string): number {
  let index: number;

  if (data === "") {
    index = 0;
  } else {
    index = Number(data) + 1;
  }

  if (isNaN(index)) {
    throw Error(`Data is not a number: ${data}`);
  }

  if (index >= LOCAL_NET_WALLET_KEYS.length) {
    index = 0;
  }

  return index;
}

export async function getUniquePrivateKey() {
  const privateKeyIndexFilePath = "tmp/private_key_index.txt";
  const index = await processFile(privateKeyIndexFilePath, processData);
  const privateKey = LOCAL_NET_WALLET_KEYS[index];
  console.log(`Using private key ${privateKey}. Index: ${index}`);

  return privateKey;
}
