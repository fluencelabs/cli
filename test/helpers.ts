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
import { access, cp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  krasnodar,
  stage,
  testNet,
} from "@fluencelabs/fluence-network-environment";

import { CLI_NAME, type Template } from "../src/lib/const.js";
import { execPromise, type ExecPromiseArg } from "../src/lib/execPromise.js";
import { local } from "../src/lib/localNodes.js";
import type { FluenceEnv } from "../src/lib/multiaddres.js";
import { getDefaultJSDirPath, getDefaultTSDirPath } from "../src/lib/paths.js";
import {
  FLUENCE_ENV,
  RUN_TESTS_IN_PARALLEL,
} from "../src/lib/setupEnvironment.js";

export const multiaddrs = {
  kras: krasnodar,
  stage: stage,
  testnet: testNet,
  local,
  // This typescript error happens only when running config docs generation script that's why type assertion is used
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unnecessary-type-assertion
}[process.env[FLUENCE_ENV] as FluenceEnv];

type CliArg = {
  args?: ExecPromiseArg["args"];
  flags?: ExecPromiseArg["flags"];
  cwd?: string;
};

const pathToFluenceExecutable = path.join(
  process.cwd(),
  path.join("tmp", "linux-x64", CLI_NAME, "bin", CLI_NAME),
);

export const fluence = async ({
  args = [],
  flags,
  cwd = process.cwd(),
}: CliArg): ReturnType<typeof execPromise> => {
  return execPromise({
    command: pathToFluenceExecutable,
    args,
    flags: {
      "no-input": true,
      ...flags,
    },
    options: { cwd },
    printOutput: true,
  });
};

const getInitializedTemplatePath = (template: Template) => {
  return path.join("tmp", "templates", template);
};

export const initFirstTime = async (template: Template) => {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await access(templatePath);
  } catch {
    await fluence({
      args: ["init", templatePath],
      flags: { template, "no-input": true },
    });

    if (template === "js" || template === "ts") {
      const cwd =
        template === "js"
          ? getDefaultJSDirPath(templatePath)
          : getDefaultTSDirPath(templatePath);

      await writeFile(path.join(cwd, "yarn.lock"), "");

      await execPromise({
        command: "yarn",
        args: [],
        options: { cwd },
      });

      await execPromise({
        command: "yarn",
        args: ["install"],
        options: { cwd },
      });
    }
  }

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

export const assertHasPeer = (result: unknown) => {
  assert(
    typeof result === "object" &&
      result !== null &&
      "peer" in result &&
      typeof result.peer === "string",
  );

  return { ...result, peer: result.peer };
};
