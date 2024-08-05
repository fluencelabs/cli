/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
