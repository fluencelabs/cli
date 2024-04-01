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

import assert from "node:assert";
import { join, relative } from "node:path";

import { initServiceConfig } from "../../../src/lib/configs/project/service.js";
import { DEFAULT_DEPLOYMENT_NAME } from "../../../src/lib/const.js";
import { fluence } from "../../helpers/commonWithSetupTests.js";
import { MY_SERVICE_NAME, NEW_SPELL_NAME } from "../../helpers/constants.js";
import { getServiceDirPath } from "../../helpers/paths.js";
import {
  assertLogsAreValid,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  initializeTemplate,
  updateFluenceConfigForTest,
  waitUntilShowSubnetReturnsExpected,
} from "../../helpers/sharedSteps.js";
import { wrappedTest } from "../../helpers/utils.js";

describe("fluence deploy tests", () => {
  wrappedTest(
    "should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployDealsAndRunCodeOnThem");
      await initializeTemplate(cwd, "quickstart");
      const pathToNewServiceDir = getServiceDirPath(cwd, MY_SERVICE_NAME);

      const newServiceConfig = await initServiceConfig(
        relative(cwd, pathToNewServiceDir),
        cwd,
      );

      assert(
        newServiceConfig !== null,
        `quickstart template is expected to create a service at ${pathToNewServiceDir} by default`,
      );

      await newServiceConfig.$commit();

      await updateFluenceConfigForTest(cwd);
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
