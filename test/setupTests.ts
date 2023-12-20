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
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
  TEMPLATES,
  TMP_DIR_NAME,
} from "../src/lib/const.js";
import "../src/lib/setupEnvironment.js";

import {
  fluence,
  fluenceEnv,
  initFirstTime,
  NO_PROJECT_TEST_NAME,
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
} from "./helpers.js";

/**
 * IMPORTANT: this file is executed before all tests,
 * so it must not export anything that can be imported in tests
 * because it will execute a second time in this case
 */

console.log("\nSetting up tests...");

await fluence({
  args: ["--version"],
});

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

try {
  const localPsResult = await fluence({
    cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
    args: ["local", "ps"],
  });

  if (localPsResult.includes("fluence")) {
    await fluence({
      cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
      args: ["local", "down"],
    });
  }
} catch (e) {
  console.log(e);
}

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

await Promise.all(
  [...restTemplatePaths, join(TMP_DIR_NAME, NO_PROJECT_TEST_NAME)].map(
    (path) => {
      return cp(
        secretsPath,
        join(path, DOT_FLUENCE_DIR_NAME, SECRETS_DIR_NAME),
        {
          force: true,
          recursive: true,
        },
      );
    },
  ),
);

await cp(
  join("test", "_resources", "aqua", "smoke.aqua"),
  join("tmp", NO_PROJECT_TEST_NAME, "smoke.aqua"),
);

console.log("\nTests are ready to run!");
