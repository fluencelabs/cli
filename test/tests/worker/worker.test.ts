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
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  DEFAULT_WORKER_NAME,
  DOT_FLUENCE_DIR_NAME,
  FS_OPTIONS,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
  WORKERS_CONFIG_FULL_FILE_NAME,
} from "../../../src/lib/const.js";
import {
  jsonStringify,
  setTryTimeout,
  stringifyUnknown,
} from "../../../src/lib/helpers/utils.js";
import { getFluenceAquaServicesPath } from "../../../src/lib/paths.js";
import { assertHasKey } from "../../../src/lib/typeHelpers.js";
import { fluence } from "../../helpers/commonWithSetupTests.js";
import {
  composeInterfacesFileContents,
  MAIN_RS_CONTENT,
  NEW_SERVICE_2_NAME,
  NEW_SERVICE_INTERFACE,
  NEW_SERVICE_NAME,
  NEW_SPELL_NAME,
  RUN_DEPLOYED_SERVICES_TIMEOUT,
  SERVICE_INTERFACES,
  UPDATED_SERVICE_INTERFACES,
} from "../../helpers/constants.js";
import { TEST_AQUA_DIR_PATH } from "../../helpers/paths.js";
import {
  createSpellAndAddToDeal,
  getFluenceConfig,
  getPeerIds,
  getServiceConfig,
  initializeTemplate,
  runAquaFunction,
  updateMainAqua,
  updateMainRs,
} from "../../helpers/sharedSteps.js";

const sortPeers = <T extends { peer: string }>(
  { peer: peerA }: T,
  { peer: peerB }: T,
) => {
  if (peerA < peerB) {
    return -1;
  }

  if (peerA > peerB) {
    return 1;
  }

  return 0;
};

const assertHasPeer = (result: unknown): { peer: string } => {
  try {
    assertHasKey("peer", result);
    assert(typeof result.peer === "string");
    return { ...result, peer: result.peer };
  } catch (err) {
    throw new Error(
      `Running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is supposed to return an array of objects of a particular shape: { peer: string }. One of the received objects doesn't match the shape: ${jsonStringify(
        result,
      )}. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

describe("integration tests", () => {
  test("should deploy workers with spell and service, resolve, run services on them and remove them", async () => {
    const cwd = join("tmp", "shouldDeployWorkersAndRunCodeOnThem");
    await initializeTemplate(cwd, "minimal");

    await updateMainAqua(
      cwd,
      await readFile(
        join(TEST_AQUA_DIR_PATH, "runDeployedWorkers.aqua"),
        FS_OPTIONS,
      ),
    );

    await fluence({
      args: ["service", "new", NEW_SERVICE_NAME],
      cwd,
    });

    const readInterfacesFile = async () => {
      return readFile(getFluenceAquaServicesPath(cwd), FS_OPTIONS);
    };

    let interfacesFileContent = await readInterfacesFile();

    // we expect to a NewService interface in services.aqua file
    expect(interfacesFileContent).toBe(
      composeInterfacesFileContents(NEW_SERVICE_INTERFACE),
    );

    const newServiceConfig = await getServiceConfig(cwd, NEW_SERVICE_NAME);

    newServiceConfig.modules.facade.envs = { A: "B" };
    await newServiceConfig.$commit();

    // update first service module source code so it contains a struct
    await updateMainRs(
      cwd,
      NEW_SERVICE_NAME,
      MAIN_RS_CONTENT,
      NEW_SERVICE_NAME,
    );

    await fluence({
      args: ["service", "new", NEW_SERVICE_2_NAME],
      cwd,
    });

    interfacesFileContent = await readInterfacesFile();

    // we expect to see both service interfaces in services.aqua file and the first one
    // should not be updated because we didn't build it, even though we changed it above
    expect(interfacesFileContent).toBe(
      composeInterfacesFileContents(SERVICE_INTERFACES),
    );

    await fluence({
      args: ["build"],
      cwd,
    });

    interfacesFileContent = await readInterfacesFile();

    // we expect to see both service interfaces in services.aqua file and the first one
    // should be updated because we built all the services above including the first one
    expect(interfacesFileContent).toBe(
      composeInterfacesFileContents(UPDATED_SERVICE_INTERFACES),
    );

    const fluenceConfig = await getFluenceConfig(cwd);

    await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME);

    const peerIds = await getPeerIds(cwd);

    fluenceConfig.hosts = {
      [DEFAULT_WORKER_NAME]: {
        peerIds,
        services: [NEW_SERVICE_2_NAME],
        spells: [NEW_SPELL_NAME],
      },
    };

    await fluenceConfig.$commit();

    await fluence({
      args: ["workers", "deploy"],
      cwd,
    });

    await setTryTimeout(
      async () => {
        const result = await fluence({
          args: ["run"],
          flags: {
            f: RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
          },
          cwd,
        });

        const parsedResult = JSON.parse(result);

        assert(
          Array.isArray(parsedResult),
          `result of running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} is expected to be an array but it is: ${result}`,
        );

        const arrayOfResults = parsedResult
          .map((u) => {
            return assertHasPeer(u);
          })
          .sort((a, b) => {
            return sortPeers(a, b);
          });

        const expected = peerIds.map((peer) => {
          return {
            answer: "Hi, fluence",
            peer,
          };
        });

        // running the deployed services is expected to return a result from each of the localPeers we deployed to
        expect(arrayOfResults).toEqual(expected);
      },
      (error) => {
        throw new Error(
          `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${stringifyUnknown(
            error,
          )}`,
        );
      },
      RUN_DEPLOYED_SERVICES_TIMEOUT,
    );

    // TODO: check worker logs
    // const logs = await fluence({ args: ["workers", "logs"], cwd });
    // assertLogsAreValid(logs);

    const workersConfigPath = join(
      cwd,
      DOT_FLUENCE_DIR_NAME,
      WORKERS_CONFIG_FULL_FILE_NAME,
    );

    const workersConfig = await readFile(workersConfigPath, FS_OPTIONS);

    let allWorkersAreRemoved = await runAquaFunction(
      cwd,
      "areAllWorkersRemoved",
    );

    expect(allWorkersAreRemoved.trim()).toBe("false");

    await fluence({
      args: ["workers", "remove"],
      cwd,
    });

    const newWorkersConfig = await readFile(workersConfigPath, FS_OPTIONS);

    assert(
      !newWorkersConfig.includes("hosts:"),
      `'hosts' property in workers.yaml config is expected to be removed. Got:\n\n${newWorkersConfig}`,
    );

    // Check workers where actually removed
    await writeFile(workersConfigPath, workersConfig, FS_OPTIONS);

    // Update "hosts.aqua" to contain previously removed workers
    await fluence({
      args: ["build"],
      cwd,
    });

    allWorkersAreRemoved = await runAquaFunction(cwd, "areAllWorkersRemoved");

    expect(allWorkersAreRemoved.trim()).toBe("true");
  });
});
