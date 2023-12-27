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

import { DEFAULT_DEAL_NAME } from "../../src/lib/const.js";
import {
  MY_SERVICE_NAME,
  NEW_MODULE_NAME,
  NEW_SERVICE_2_NAME,
  NEW_SPELL_NAME,
} from "../constants.js";
import { fluence, init } from "../helpers.js";
import {
  assertLogsAreValid,
  build,
  createModuleAndAddToService,
  createServiceAndAddToDeal,
  createSpellAndAddToDeal,
  deployDealAndWaitUntilDeployed,
  getFluenceConfig,
  updateMainRs,
  waitUntilRunDeployedServicesReturnsExpected,
  waitUntilShowSubnetReturnsExpected,
} from "../sharedSteps.js";

async function updateFluenceConfigForTest(cwd: string) {
  const fluenceConfig = await getFluenceConfig(cwd);

  assert(
    fluenceConfig.deals !== undefined &&
      fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
    `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  fluenceConfig.deals[DEFAULT_DEAL_NAME].targetWorkers = 3;
  fluenceConfig.deals[DEFAULT_DEAL_NAME].services = [MY_SERVICE_NAME];
  await fluenceConfig.$commit();
  return fluenceConfig;
}

describe("Deal update tests", () => {
  // TODO: test skipped until NET-649 is released
  test.skip("should update deal after new spell is created", async () => {
    const cwd = join("tmp", "shouldUpdateDealsAfterNewSpellIsCreated");
    await init(cwd, "quickstart");

    const fluenceConfig = await updateFluenceConfigForTest(cwd);

    await deployDealAndWaitUntilDeployed(cwd);

    await createSpellAndAddToDeal(cwd, fluenceConfig, NEW_SPELL_NAME);

    await deployDealAndWaitUntilDeployed(cwd);

    await waitUntilShowSubnetReturnsExpected(
      cwd,
      [MY_SERVICE_NAME],
      [NEW_SPELL_NAME],
    );

    const logs = await fluence({ args: ["deal", "logs"], cwd });

    assertLogsAreValid(logs);
  });

  // TODO: test skipped until NET-649 is released
  test.skip("should update deal after new service is created", async () => {
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
  });

  // TODO: test skipped until NET-649 is released
  test.skip("should update deal after new module is created", async () => {
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
