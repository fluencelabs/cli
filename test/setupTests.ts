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

import { cp } from "fs/promises";
import { join } from "path";

import {
  krasnodar,
  stage,
  testNet,
} from "@fluencelabs/fluence-network-environment";

import {
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
  TEMPLATES,
  TMP_DIR_NAME,
} from "../src/lib/const.js";
import "../src/lib/setupEnvironment.js";
import { addrsToNodes } from "../src/lib/multiaddres.js";

import {
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  fluenceEnv,
  fluence,
  initFirstTime,
} from "./helpers.js";

// eslint-disable-next-line no-console
console.log("Setting up tests...");

await fluence({
  args: ["dep", "i"],
});

try {
  await fluence({
    args: ["key", "new", "default", "--default", "--user"],
  });
} catch {}

const [, ...restTemplatePaths] = await Promise.all(
  TEMPLATES.map((template) => {
    return initFirstTime(template);
  }),
);

if (fluenceEnv === "local") {
  await fluence({
    args: ["local", "up"],
    cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  });
}

const secretsPath = join(
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
);

export const NO_PROJECT = "shouldWorkWithoutProject";

await Promise.all(
  [...restTemplatePaths, join(TMP_DIR_NAME, NO_PROJECT)].map((path) => {
    return cp(secretsPath, join(path, DOT_FLUENCE_DIR_NAME, SECRETS_DIR_NAME), {
      force: true,
      recursive: true,
    });
  }),
);

const local =
  fluenceEnv === "local"
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
    : [];

export const multiaddrs = {
  kras: krasnodar,
  stage: stage,
  testnet: testNet,
  local,
}[fluenceEnv];

// eslint-disable-next-line no-console
console.log("Tests are ready to run!");
