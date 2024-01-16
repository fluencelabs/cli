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
import { join } from "node:path";

import {
  MY_SERVICE_NAME,
  NEW_MODULE_NAME,
  NEW_SERVICE_2_NAME,
  NEW_SPELL_NAME,
  TEST_AQUA_DIR_PATH,
} from "../constants.js";
import { fluence, init, maybeConcurrentTest } from "../helpers.js";
import {
  assertLogsAreValid,
  build,
  createModuleAndAddToService,
  createServiceAndAddToDeal,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  updateFluenceConfigForTest,
  updateMainRs,
  updateSpellAqua,
  waitUntilAquaScriptReturnsExpected,
  waitUntilRunDeployedServicesReturnsExpected,
  waitUntilShowSubnetReturnsExpected,
} from "../sharedSteps.js";

describe("Deal update tests", () => {
  maybeConcurrentTest(
    "should update deal after new spell is created",
    async () => {
      const cwd = join("tmp", "shouldUpdateDealsAfterNewSpellIsCreated");
      await init(cwd, "quickstart");

      await updateFluenceConfigForTest(cwd);

      await deployDealAndWaitUntilDeployed(cwd);

      await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME);

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

  maybeConcurrentTest(
    "should update deal after new service is created",
    async () => {
      const cwd = join("tmp", "shouldUpdateDealsAfterNewServiceIsCreated");
      await init(cwd, "quickstart");

      await updateFluenceConfigForTest(cwd);

      await deployDealAndWaitUntilDeployed(cwd);

      await createServiceAndAddToDeal(cwd, NEW_SERVICE_2_NAME);

      await build(cwd);

      await deployDealAndWaitUntilDeployed(cwd);

      await waitUntilShowSubnetReturnsExpected(
        cwd,
        [MY_SERVICE_NAME, NEW_SERVICE_2_NAME],
        [],
      );

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      assertLogsAreValid(logs);
    },
  );

  maybeConcurrentTest(
    "should update deal after new module is created",
    async () => {
      const cwd = join("tmp", "shouldUpdateDealAfterNewModuleIsCreated");
      await init(cwd, "quickstart");

      await updateFluenceConfigForTest(cwd);

      await deployDealAndWaitUntilDeployed(cwd);

      await createModuleAndAddToService(cwd, NEW_MODULE_NAME, MY_SERVICE_NAME);

      await updateMainRs(cwd, NEW_MODULE_NAME, NEW_MODULE_CONTENT);

      await updateMainRs(
        cwd,
        MY_SERVICE_NAME,
        FACADE_MODULE_CONTENT,
        MY_SERVICE_NAME,
      );

      await deployDealAndWaitUntilDeployed(cwd);

      await waitUntilRunDeployedServicesReturnsExpected(
        cwd,
        `Hey, fluence! I'm The New Module.`,
      );

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      assertLogsAreValid(logs);
    },
  );

  maybeConcurrentTest(
    "should update deal after changing a service",
    async () => {
      const cwd = join("tmp", "shouldUpdateDealAfterChangingAService");
      await init(cwd, "quickstart");

      await updateFluenceConfigForTest(cwd);

      await deployDealAndWaitUntilDeployed(cwd);

      await updateMainRs(
        cwd,
        MY_SERVICE_NAME,
        UPDATED_SERVICE_CONTENT,
        MY_SERVICE_NAME,
      );

      await deployDealAndWaitUntilDeployed(cwd);

      await waitUntilRunDeployedServicesReturnsExpected(
        cwd,
        `Hey, fluence! I've been updated.`,
      );

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      assertLogsAreValid(logs);
    },
  );

  maybeConcurrentTest("should update deal after changing a spell", async () => {
    const cwd = join("tmp", "shouldUpdateDealAfterChangingASpell");
    await init(cwd, "quickstart");

    await cp(
      join(TEST_AQUA_DIR_PATH, GET_SPELL_LOGS_AQUA_FILE_NAME),
      join(cwd, GET_SPELL_LOGS_AQUA_FILE_NAME),
    );

    await updateFluenceConfigForTest(cwd);

    await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME);

    await deployDealAndWaitUntilDeployed(cwd);

    await updateSpellAqua(cwd, NEW_SPELL_NAME, UPDATED_SPELL_CONTENT);

    await deployDealAndWaitUntilDeployed(cwd);

    await waitUntilAquaScriptReturnsExpected(
      cwd,
      NEW_SPELL_NAME,
      "getSpellLogs",
      "getSpellLogs.aqua",
      "if you see this, then the spell is working",
    );

    const logs = await fluence({ args: ["deal", "logs"], cwd });

    assertLogsAreValid(logs);
  });
});

const NEW_MODULE_CONTENT = `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub fn newModuleGreeting(name: String) -> String {
    format!("Hey, {}! I'm The New Module.", name)
}
`;

const FACADE_MODULE_CONTENT = `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub fn greeting(name: String) -> String {
    newModuleGreeting(name)
}

#[marine]
#[link(wasm_import_module = "${NEW_MODULE_NAME}")]
extern "C" {
    fn newModuleGreeting(name: String) -> String;
}`;

const UPDATED_SERVICE_CONTENT = `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub fn greeting(name: String) -> String {
    format!("Hey, {}! I've been updated.", name)
}
`;

const GET_SPELL_LOGS_AQUA_FILE_NAME = "getSpellLogs.aqua";

const UPDATED_SPELL_CONTENT = `import Op, Debug from "@fluencelabs/aqua-lib/builtin.aqua"
import Spell from "@fluencelabs/spell/spell_service.aqua"

func spell():
    msg = "if you see this, then the spell is working"
    str <- Debug.stringify(msg)
    Spell "worker-spell"
    Spell.store_log(str)
`;
