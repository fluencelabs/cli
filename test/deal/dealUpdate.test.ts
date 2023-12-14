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
import { join } from "node:path";

import { CLIError } from "@oclif/core/lib/errors/index.js";

import {
  type CommandObj,
  setCommandObjAndIsInteractive,
} from "../../src/lib/commandObj.js";
import { DEFAULT_DEAL_NAME } from "../../src/lib/const.js";
import { MY_SERVICE_NAME, NEW_SPELL_NAME } from "../const.js"; // TODO: test skipped until NET-649 is released
import { fluence, init } from "../helpers.js";
import {
  assertLogsAreValid,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  getFluenceConfig,
  waitUntilShowSubnetReturnsSpell,
} from "../sharedSteps.js";

describe("Deal update tests", () => {
  beforeAll(() => {
    setCommandObjAndIsInteractive(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {
        log(msg: string) {
          // eslint-disable-next-line no-console
          console.log(msg);
        },
        error(msg: string) {
          throw new CLIError(msg);
        },
      } as CommandObj,
      false,
    );
  });

  // TODO: test skipped until NET-649 is released
  test.skip("should update deal after new spell is created", async () => {
    const cwd = join("tmp", "shouldUpdateDealsAfterNewSpellIsCreated");
    await init(cwd, "quickstart");

    const fluenceConfig = await getFluenceConfig(cwd);

    assert(
      fluenceConfig.deals !== undefined &&
        fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
      `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
    );

    fluenceConfig.deals[DEFAULT_DEAL_NAME].targetWorkers = 3;
    fluenceConfig.deals[DEFAULT_DEAL_NAME].services = [MY_SERVICE_NAME];
    await fluenceConfig.$commit();

    await deployDealAndWaitUntilDeployed(cwd);

    await createSpellAndAddToDeal(cwd, fluenceConfig, NEW_SPELL_NAME);

    await deployDealAndWaitUntilDeployed(cwd);

    await waitUntilShowSubnetReturnsSpell(cwd, MY_SERVICE_NAME, NEW_SPELL_NAME);

    const logs = await fluence({ args: ["deal", "logs"], cwd });

    assertLogsAreValid(logs);
  });
});
