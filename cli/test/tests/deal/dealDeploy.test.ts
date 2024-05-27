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

import { join } from "node:path";

import { describe } from "vitest";

import { DEFAULT_DEPLOYMENT_NAME } from "../../../src/lib/const.js";
import { fluence } from "../../helpers/commonWithSetupTests.js";
import { MY_SERVICE_NAME, NEW_SPELL_NAME } from "../../helpers/constants.js";
import {
  assertLogsAreValid,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  initializeTemplate,
  waitUntilShowSubnetReturnsExpected,
} from "../../helpers/sharedSteps.js";
import { wrappedTest } from "../../helpers/utils.js";

describe("fluence deploy tests", () => {
  wrappedTest(
    "should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("test", "tmp", "shouldDeployDealsAndRunCodeOnThem");
      await initializeTemplate(cwd, "quickstart");

      await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME);

      await deployDealAndWaitUntilDeployed(cwd);

      await waitUntilShowSubnetReturnsExpected(
        cwd,
        [MY_SERVICE_NAME],
        [NEW_SPELL_NAME],
      );

      const logs = await fluence({
        args: ["deal", "logs", DEFAULT_DEPLOYMENT_NAME],
        cwd,
      });

      assertLogsAreValid(logs);
    },
  );
});
