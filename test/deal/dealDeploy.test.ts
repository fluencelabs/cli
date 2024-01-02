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

import { initServiceConfig } from "../../src/lib/configs/project/service.js";
import { DEFAULT_DEAL_NAME } from "../../src/lib/const.js";
import { MY_SERVICE_NAME, NEW_SPELL_NAME } from "../constants.js";
import { fluence, init, maybeConcurrentTest } from "../helpers.js";
import {
  assertLogsAreValid,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  getFluenceConfig,
  getServiceDirPath,
  waitUntilShowSubnetReturnsExpected,
} from "../sharedSteps.js";

describe("Deal deploy tests", () => {
  maybeConcurrentTest(
    "should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployDealsAndRunCodeOnThem");
      await init(cwd, "quickstart");
      const pathToNewServiceDir = getServiceDirPath(cwd, MY_SERVICE_NAME);

      const newServiceConfig = await initServiceConfig(
        relative(cwd, pathToNewServiceDir),
        cwd,
      );

      assert(
        newServiceConfig !== null,
        `quickstart template is expected to create a service at ${pathToNewServiceDir} by default`,
      );

      newServiceConfig.modules.facade.envs = { A: "B" };
      await newServiceConfig.$commit();

      const fluenceConfig = await getFluenceConfig(cwd);
      await createSpellAndAddToDeal(cwd, fluenceConfig, NEW_SPELL_NAME);

      assert(
        fluenceConfig.deals !== undefined &&
          fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
        `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
      );

      fluenceConfig.deals[DEFAULT_DEAL_NAME].targetWorkers = 3;
      fluenceConfig.deals[DEFAULT_DEAL_NAME].services = [MY_SERVICE_NAME];
      await fluenceConfig.$commit();

      await deployDealAndWaitUntilDeployed(cwd);

      await waitUntilShowSubnetReturnsExpected(
        cwd,
        [MY_SERVICE_NAME],
        [NEW_SPELL_NAME],
      );

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      assertLogsAreValid(logs);
    },
  );
});
