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

import { cp } from "fs/promises";
import { join } from "node:path";

import { describe } from "vitest";

import { DEFAULT_DEPLOYMENT_NAME } from "../../../src/lib/const.js";
import { fluence } from "../../helpers/commonWithSetupTests.js";
import { UPDATED_SPELL_MESSAGE } from "../../helpers/constants.js";
import {
  GET_SPELL_LOGS_FUNCTION_NAME,
  MY_SERVICE_NAME,
  NEW_MODULE_NAME,
  NEW_SERVICE_2_NAME,
  NEW_SPELL_NAME,
} from "../../helpers/constants.js";
import { TEST_AQUA_DIR_PATH } from "../../helpers/paths.js";
import {
  assertLogsAreValid,
  build,
  createModuleAndAddToService,
  createServiceAndAddToDeal,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  initializeTemplate,
  updateMainRs,
  updateSpellAqua,
  waitUntilAquaScriptReturnsExpected,
  waitUntilRunDeployedServicesReturnsExpected,
  waitUntilShowSubnetReturnsExpected,
} from "../../helpers/sharedSteps.js";
import { wrappedTest } from "../../helpers/utils.js";
import { validateSpellLogs } from "../../validators/spellLogsValidator.js";

describe("Deal update tests", () => {
  wrappedTest("should update deal after new spell is created", async () => {
    const cwd = join("test", "tmp", "shouldUpdateDealsAfterNewSpellIsCreated");
    await initializeTemplate(cwd, "quickstart");

    await deployDealAndWaitUntilDeployed(cwd);

    await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME);

    await deployDealAndWaitUntilDeployed(cwd, true);

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
  });

  wrappedTest("should update deal after new service is created", async () => {
    const cwd = join(
      "test",
      "tmp",
      "shouldUpdateDealsAfterNewServiceIsCreated",
    );

    await initializeTemplate(cwd, "quickstart");

    await deployDealAndWaitUntilDeployed(cwd);

    await createServiceAndAddToDeal(cwd, NEW_SERVICE_2_NAME);

    await build(cwd);

    await deployDealAndWaitUntilDeployed(cwd, true);

    await waitUntilShowSubnetReturnsExpected(
      cwd,
      [MY_SERVICE_NAME, NEW_SERVICE_2_NAME],
      [],
    );

    const logs = await fluence({
      args: ["deal", "logs", DEFAULT_DEPLOYMENT_NAME],
      cwd,
    });

    assertLogsAreValid(logs);
  });

  wrappedTest("should update deal after new module is created", async () => {
    const cwd = join("test", "tmp", "shouldUpdateDealAfterNewModuleIsCreated");
    await initializeTemplate(cwd, "quickstart");

    await deployDealAndWaitUntilDeployed(cwd);

    await createModuleAndAddToService(cwd, NEW_MODULE_NAME, MY_SERVICE_NAME);

    await updateMainRs(cwd, NEW_MODULE_NAME, NEW_MODULE_CONTENT);

    await updateMainRs(
      cwd,
      MY_SERVICE_NAME,
      FACADE_MODULE_CONTENT,
      MY_SERVICE_NAME,
    );

    await deployDealAndWaitUntilDeployed(cwd, true);

    await waitUntilRunDeployedServicesReturnsExpected(
      cwd,
      `Hey, fluence! I'm The New Module.`,
    );
  });

  wrappedTest("should update deal after changing a service", async () => {
    const cwd = join("test", "tmp", "shouldUpdateDealAfterChangingAService");
    await initializeTemplate(cwd, "quickstart");

    await deployDealAndWaitUntilDeployed(cwd);

    await updateMainRs(
      cwd,
      MY_SERVICE_NAME,
      UPDATED_SERVICE_CONTENT,
      MY_SERVICE_NAME,
    );

    await deployDealAndWaitUntilDeployed(cwd, true);

    await waitUntilRunDeployedServicesReturnsExpected(
      cwd,
      `Hey, fluence! I've been updated.`,
    );

    const logs = await fluence({
      args: ["deal", "logs", DEFAULT_DEPLOYMENT_NAME],
      cwd,
    });

    assertLogsAreValid(logs);
  });

  wrappedTest("should update deal after changing a spell", async () => {
    const cwd = join("test", "tmp", "shouldUpdateDealAfterChangingASpell");
    await initializeTemplate(cwd, "quickstart");

    await cp(
      join(TEST_AQUA_DIR_PATH, GET_SPELL_LOGS_AQUA_FILE_NAME),
      join(cwd, GET_SPELL_LOGS_AQUA_FILE_NAME),
    );

    await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME);

    await deployDealAndWaitUntilDeployed(cwd);

    await updateSpellAqua(cwd, NEW_SPELL_NAME, UPDATED_SPELL_CONTENT);

    await deployDealAndWaitUntilDeployed(cwd, true);

    await waitUntilAquaScriptReturnsExpected({
      cwd,
      functionName: GET_SPELL_LOGS_FUNCTION_NAME,
      aquaFileName: "getSpellLogs.aqua",
      validation: validateSpellLogs,
      args: [NEW_SPELL_NAME],
    });

    const logs = await fluence({
      args: ["deal", "logs", DEFAULT_DEPLOYMENT_NAME],
      cwd,
    });

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
#[module_import("${NEW_MODULE_NAME}")]
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

const UPDATED_SPELL_CONTENT = `aqua Spell
export spell

import Op, Debug from "@fluencelabs/aqua-lib/builtin.aqua"
import Spell from "@fluencelabs/spell/spell_service.aqua"

func spell():
    msg = ${UPDATED_SPELL_MESSAGE}
    str <- Debug.stringify(msg)
    Spell "spell"
    Spell.store_log(str)
`;
