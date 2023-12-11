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
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { CLIError } from "@oclif/core/lib/errors/index.js";
import type { JSONSchemaType } from "ajv";
import Ajv from "ajv";

import {
  setCommandObjAndIsInteractive,
  type CommandObj,
} from "../src/lib/commandObj.js";
import { initFluenceConfigWithPath } from "../src/lib/configs/project/fluence.js";
import { initServiceConfig } from "../src/lib/configs/project/service.js";
import {
  DEFAULT_DEAL_NAME,
  DEFAULT_WORKER_NAME,
  DOT_FLUENCE_DIR_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FS_OPTIONS,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
  WORKERS_CONFIG_FULL_FILE_NAME,
  LOCAL_NET_DEFAULT_WALLET_KEY,
} from "../src/lib/const.js";
import {
  setTryTimeout,
  jsonStringify,
  LOGS_RESOLVE_SUBNET_ERROR_START,
  LOGS_GET_ERROR_START,
  stringifyUnknown,
} from "../src/lib/helpers/utils.js";
import {
  getServicesDir,
  getFluenceAquaServicesPath,
  getAquaMainPath,
  getSpellsDir,
} from "../src/lib/paths.js";

import {
  fluence,
  init,
  maybeConcurrentTest,
  sortPeers,
  assertHasWorkerAndAnswer,
  assertHasPeer,
  fluenceEnv,
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  NO_PROJECT_TEST_NAME,
  getMultiaddrs,
} from "./helpers.js";

const multiaddrs = await getMultiaddrs();

const peerIds = multiaddrs
  .map(({ peerId }) => {
    return peerId;
  })
  .sort();

describe("integration tests", () => {
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

  afterAll(async () => {
    if (process.env.CI === "false") {
      await fluence({
        args: ["local", "down"],
        cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
      });
    }
  });

  maybeConcurrentTest("should work with minimal template", async () => {
    const cwd = join("tmp", "shouldWorkWithMinimalTemplate");
    await init(cwd, "minimal");

    await fluence({
      args: ["run"],
      flags: {
        f: 'helloWorld("Fluence")',
      },
      cwd,
    });
  });

  maybeConcurrentTest("should work without project", async () => {
    const cwd = join("tmp", NO_PROJECT_TEST_NAME);
    await mkdir(cwd, { recursive: true });

    const result = await fluence({
      args: ["run"],
      flags: {
        relay: multiaddrs[0]?.multiaddr,
        env: fluenceEnv,
        f: "identify()",
        i: resolve(join("test", "aqua", "smoke.aqua")),
        quiet: true,
      },
      cwd,
    });

    const parsedResult = JSON.parse(result);
    // Peer.identify() is supposed to return an object with air_version key
    expect(parsedResult).toHaveProperty("air_version");
  });

  maybeConcurrentTest(
    "should deploy workers with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployWorkersAndRunCodeOnThem");
      await init(cwd, "minimal");

      await writeFile(
        getAquaMainPath(cwd),
        await readFile(
          join("test", "aqua", "runDeployedWorkers.aqua"),
          FS_OPTIONS,
        ),
        FS_OPTIONS,
      );

      await fluence({
        args: ["service", "new", WD_NEW_SERVICE_NAME],
        cwd,
      });

      const readInterfacesFile = async () => {
        return readFile(getFluenceAquaServicesPath(cwd), FS_OPTIONS);
      };

      let interfacesFileContent = await readInterfacesFile();
      // we expect to a NewService interface in services.aqua file
      expect(interfacesFileContent).toBe(`${WD_NEW_SERVICE_INTERFACE}\n`);

      const pathToNewServiceDir = join(
        getServicesDir(cwd),
        WD_NEW_SERVICE_NAME,
      );

      const newServiceConfig = await initServiceConfig(
        relative(cwd, pathToNewServiceDir),
        cwd,
      );

      assert(
        newServiceConfig !== null,
        `we create a service at ${pathToNewServiceDir} above - so the config is expected to exist`,
      );

      newServiceConfig.modules.facade.envs = { A: "B" };
      await newServiceConfig.$commit();

      // update first service module source code so it contains a struct

      await writeFile(
        join(
          pathToNewServiceDir,
          join("modules", WD_NEW_SERVICE_NAME, "src", "main.rs"),
        ),
        WD_MAIN_RS_CONTENT,
        FS_OPTIONS,
      );

      await fluence({
        args: ["service", "new", WD_NEW_SERVICE_2_NAME],
        cwd,
      });

      interfacesFileContent = await readInterfacesFile();

      // we expect to see both service interfaces in services.aqua file and the first one should not be updated because we didn't build it, even though we changed it above
      expect(interfacesFileContent).toBe(WD_SERVICE_INTERFACES);

      await fluence({
        args: ["build"],
        cwd,
      });

      interfacesFileContent = await readInterfacesFile();

      // we expect to see both service interfaces in services.aqua file and the first one should be updated because we built all the services above including the first one
      expect(interfacesFileContent).toBe(WD_UPDATED_SERVICE_INTERFACES);

      const NEW_SPELL_NAME = "newSpell";

      await fluence({
        args: ["spell", "new", NEW_SPELL_NAME],
        cwd,
      });

      const fluenceConfig = await initFluenceConfigWithPath(cwd);

      assert(
        fluenceConfig !== null,
        `We initialized the project at ${cwd} above, so the fluence config is expected to exist in that dir`,
      );

      const pathToNewSpell = relative(
        cwd,
        join(getSpellsDir(cwd), NEW_SPELL_NAME),
      );

      fluenceConfig.spells = {
        newSpell: {
          get: pathToNewSpell,
        },
      };

      fluenceConfig.hosts = {
        [DEFAULT_WORKER_NAME]: {
          peerIds,
          services: [WD_NEW_SERVICE_2_NAME],
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

      let allWorkersAreRemoved = await fluence({
        args: ["run"],
        flags: {
          f: "areAllWorkersRemoved()",
        },
        cwd,
      });

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

      allWorkersAreRemoved = await fluence({
        args: ["run"],
        flags: {
          f: "areAllWorkersRemoved()",
        },
        cwd,
      });

      expect(allWorkersAreRemoved.trim()).toBe("true");
    },
  );

  maybeConcurrentTest(
    "should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployDealsAndRunCodeOnThem");
      await init(cwd, "quickstart");
      const MY_SERVICE_NAME = "myService";
      const pathToNewServiceDir = join(getServicesDir(cwd), MY_SERVICE_NAME);

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

      const NEW_SPELL_NAME = "newSpell";

      await fluence({
        args: ["spell", "new", NEW_SPELL_NAME],
        cwd,
      });

      const fluenceConfig = await initFluenceConfigWithPath(cwd);

      assert(
        fluenceConfig !== null,
        `every fluence template is expected to have a ${FLUENCE_CONFIG_FULL_FILE_NAME}, but found nothing at ${cwd}`,
      );

      const pathToNewSpell = join(getSpellsDir(cwd), NEW_SPELL_NAME);

      fluenceConfig.spells = {
        newSpell: {
          get: relative(cwd, pathToNewSpell),
        },
      };

      assert(
        fluenceConfig.deals !== undefined &&
          fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
        `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
      );

      fluenceConfig.deals[DEFAULT_DEAL_NAME].targetWorkers = 3;
      fluenceConfig.deals[DEFAULT_DEAL_NAME].services = [MY_SERVICE_NAME];
      fluenceConfig.deals[DEFAULT_DEAL_NAME].spells = [NEW_SPELL_NAME];
      await fluenceConfig.$commit();

      await fluence({
        args: ["deal", "deploy"],
        flags: {
          "priv-key": LOCAL_NET_DEFAULT_WALLET_KEY,
        },
        cwd,
      });

      await setTryTimeout(
        async () => {
          const result = await fluence({
            args: ["run"],
            flags: {
              f: RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
              quiet: true,
            },
            cwd,
          });

          const parsedResult = JSON.parse(result);

          assert(
            Array.isArray(parsedResult),
            `result of running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is expected to be an array, but it is: ${result}`,
          );

          const arrayOfResults = parsedResult.map((u) => {
            return assertHasWorkerAndAnswer(u);
          });

          const resultsWithNoAnswer = arrayOfResults.filter(({ answer }) => {
            return answer === null;
          });

          assert(
            resultsWithNoAnswer.length === 0,
            `When running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} nox returned workers from blockchain that has worker_id == null: ${resultsWithNoAnswer
              .map(({ worker }) => {
                return jsonStringify(worker);
              })
              .join("\n")}`,
          );

          const expected = multiaddrs
            .map((peer) => {
              return {
                answer: "Hi, fluence",
                peer: peer.peerId,
              };
            })
            .sort((a, b) => {
              return sortPeers(a, b);
            });

          const res = arrayOfResults
            .map(({ answer, worker }) => {
              return {
                answer,
                peer: worker.host_id,
              };
            })
            .sort((a, b) => {
              return sortPeers(a, b);
            });

          // We expect to have one result from each of the local peers, because we requested 3 workers and we have 3 local peers
          expect(res).toEqual(expected);
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

      const showSubnetResult = await fluence({
        args: ["run"],
        flags: {
          f: "showSubnet()",
          quiet: true,
        },
        cwd,
      });

      const parsedShowSubnetResult = JSON.parse(showSubnetResult);

      if (!validateWorkerServices(parsedShowSubnetResult)) {
        throw new Error(
          `result of running showSubnet aqua function is expected to be an array of WorkerServices, but it is: ${showSubnetResult}`,
        );
      }

      parsedShowSubnetResult
        .sort((a, b) => {
          if (a.host_id < b.host_id) {
            return -1;
          }

          if (a.host_id > b.host_id) {
            return 1;
          }

          return 0;
        })
        .forEach((w) => {
          return w.spells.sort();
        });

      expect(parsedShowSubnetResult).toEqual(
        peerIds.map((host_id, i) => {
          return {
            host_id,
            services: [MY_SERVICE_NAME],
            spells: [NEW_SPELL_NAME, "worker-spell"],
            worker_id: parsedShowSubnetResult[i]?.worker_id,
          };
        }),
      );

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      assertLogsAreValid(logs);
    },
  );

  maybeConcurrentTest(
    "should update deal after new spell is crated",
    async () => {
      const cwd = join("tmp", "shouldUpdateDealsAfterNewSpellIsCreated");
      await init(cwd, "quickstart");

      const MY_SERVICE_NAME = "myService";
      const pathToNewServiceDir = join(getServicesDir(cwd), MY_SERVICE_NAME);

      await initDefaultServiceConfig(cwd, pathToNewServiceDir);

      await initDefaultFluenceConfig(cwd, MY_SERVICE_NAME);

      await deployDealAndWaitUntilDeployed(cwd);

      const NEW_SPELL_NAME = "newSpell";

      await createSpellAndAddToDeal(cwd, NEW_SPELL_NAME)

      await deployDealAndWaitUntilDeployed(cwd);

      await waitUntilShowSubnetReturnsSpell(cwd, MY_SERVICE_NAME, NEW_SPELL_NAME);

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      assertLogsAreValid(logs);
    }
  );
});

const RUN_DEPLOYED_SERVICES_TIMEOUT = 1000 * 60 * 3;

const WD_MAIN_RS_CONTENT = `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub struct MyStruct {
    a: i32,
    b: i32,
}

#[marine]
pub fn greeting() -> MyStruct {
  MyStruct{
    a: 1,
    b: 2,
  }
}
`;

const WD_NEW_SERVICE_NAME = "newService";

const WD_NEW_SERVICE_INTERFACE = `service NewService("${WD_NEW_SERVICE_NAME}"):
  greeting(name: string) -> string`;

const WD_NEW_SERVICE_2_NAME = "newService2";

const WD_NEW_SERVICE_2_INTERFACE = `service NewService2("${WD_NEW_SERVICE_2_NAME}"):
  greeting(name: string) -> string`;

const WD_SERVICE_INTERFACES = `${WD_NEW_SERVICE_INTERFACE}


${WD_NEW_SERVICE_2_INTERFACE}
`;

const WD_UPDATED_SERVICE_INTERFACES = `data MyStruct:
  a: i32
  b: i32

service NewService("${WD_NEW_SERVICE_NAME}"):
  greeting() -> MyStruct


${WD_NEW_SERVICE_2_INTERFACE}
`;

const waitUntilDealDeployed = async (cwd: string) => {
  const result = await fluence({
    args: ["run"],
    flags: {
      f: RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
      quiet: true,
    },
    cwd,
  });

  const parsedResult = JSON.parse(result);

  assert(
    Array.isArray(parsedResult),
    `result of running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is expected to be an array, but it is: ${result}`,
  );

  const arrayOfResults = parsedResult.map((u) => {
    return assertHasWorkerAndAnswer(u);
  });

  const resultsWithNoAnswer = arrayOfResults.filter(({ answer }) => {
    return answer === null;
  });

  assert(
    resultsWithNoAnswer.length === 0,
    `When running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} nox returned workers from blockchain that has worker_id == null: ${resultsWithNoAnswer
      .map(({ worker }) => {
        return jsonStringify(worker);
      })
      .join("\n")}`,
  );

  const expected = multiaddrs
    .map((peer) => {
      return {
        answer: "Hi, fluence",
        peer: peer.peerId,
      };
    })
    .sort((a, b) => {
      return sortPeers(a, b);
    });

  const res = arrayOfResults
    .map(({ answer, worker }) => {
      return {
        answer,
        peer: worker.host_id,
      };
    })
    .sort((a, b) => {
      return sortPeers(a, b);
    });

  // We expect to have one result from each of the local peers, because we requested 3 workers and we have 3 local peers
  expect(res).toEqual(expected);
}

async function deployDealAndWaitUntilDeployed(cwd: string) {
  await fluence({
    args: ["deal", "deploy"],
    flags: {
      "priv-key": LOCAL_NET_DEFAULT_WALLET_KEY
    },
    cwd
  });

  await setTryTimeout(
    async () => {
      return waitUntilDealDeployed(cwd);
    },
    (error) => {
      throw new Error(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${stringifyUnknown(
          error
        )}`
      );
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT
  );
}

async function waitUntilShowSubnetReturnsSpell(cwd: string, serviceName: string, spellName: string) {
  await setTryTimeout(
    async () => {
      const showSubnetResult = await fluence({
        args: ["run"],
        flags: {
          f: "showSubnet()",
          quiet: true
        },
        cwd
      });

      const parsedShowSubnetResult = JSON.parse(showSubnetResult);

      if (!validateWorkerServices(parsedShowSubnetResult)) {
        throw new Error(
          `result of running showSubnet aqua function is expected to be an array of WorkerServices, but it is: ${showSubnetResult}`
        );
      }

      parsedShowSubnetResult
        .sort((a, b) => {
          if (a.host_id < b.host_id) {
            return -1;
          }

          if (a.host_id > b.host_id) {
            return 1;
          }

          return 0;
        })
        .forEach((w) => {
          return w.spells.sort();
        });

      expect(parsedShowSubnetResult).toEqual(
        peerIds.map((host_id, i) => {
          return {
            host_id,
            services: [serviceName],
            spells: [spellName, "worker-spell"],
            worker_id: parsedShowSubnetResult[i]?.worker_id
          };
        })
      );
    },
    (error) => {
      throw new Error(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${20 * 60 * 1000} ms, error: ${stringifyUnknown(
          error
        )}`
      );
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT
  );
}

export async function createSpellAndAddToDeal(cwd: string, spellName: string) {
  await fluence({
    args: ["spell", "new", spellName],
    cwd,
  });

  const fluenceConfig = await initFluenceConfigWithPath(cwd);

  assert(
    fluenceConfig !== null,
    `every fluence template is expected to have a ${FLUENCE_CONFIG_FULL_FILE_NAME}, but found nothing at ${cwd}`
  );

  assert(
    fluenceConfig.deals !== undefined &&
    fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
    `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`
  );

  const pathToNewSpell = join(getSpellsDir(cwd), spellName);

  fluenceConfig.spells = {
    newSpell: {
      get: relative(cwd, pathToNewSpell),
    },
  };

  fluenceConfig.deals[DEFAULT_DEAL_NAME].spells = [spellName];
  await fluenceConfig.$commit();
}

async function initDefaultFluenceConfig(cwd: string, MY_SERVICE_NAME: string) {
  const fluenceConfig = await initFluenceConfigWithPath(cwd);

  assert(
    fluenceConfig !== null,
    `every fluence template is expected to have a ${FLUENCE_CONFIG_FULL_FILE_NAME}, but found nothing at ${cwd}`
  );

  assert(
    fluenceConfig.deals !== undefined &&
    fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
    `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`
  );

  fluenceConfig.deals[DEFAULT_DEAL_NAME].targetWorkers = 3;
  fluenceConfig.deals[DEFAULT_DEAL_NAME].minWorkers = 3;
  fluenceConfig.deals[DEFAULT_DEAL_NAME].services = [MY_SERVICE_NAME];
  await fluenceConfig.$commit();
}

async function initDefaultServiceConfig(cwd: string, pathToNewServiceDir: string) {
  const serviceConfig = await initServiceConfig(
    relative(cwd, pathToNewServiceDir),
    cwd
  );

  assert(
    serviceConfig !== null,
    `quickstart template is expected to create a service at ${pathToNewServiceDir} by default`
  );

  serviceConfig.modules.facade.envs = { A: "B" };
  await serviceConfig.$commit();
}

function assertLogsAreValid(logs: string) {
  if (logs.includes(LOGS_RESOLVE_SUBNET_ERROR_START)) {
    throw new Error(
      `Failed to resolve subnet when getting deal logs:\n\n${logs}`,
    );
  }

  assert(logs.trim() !== "", "logs are expected to be non-empty");

  if (logs.includes(LOGS_GET_ERROR_START)) {
    throw new Error(`Failed to get deal logs:\n\n${logs}`);
  }
}

type WorkerServices = {
  host_id: string;
  services: string[];
  spells: string[];
  worker_id: string;
}[];

const workerServiceSchema: JSONSchemaType<WorkerServices> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      host_id: { type: "string" },
      services: {
        type: "array",
        items: { type: "string" },
      },
      spells: {
        type: "array",
        items: { type: "string" },
      },
      worker_id: { type: "string" },
    },
    required: ["host_id", "services", "spells", "worker_id"],
  },
};

const validateWorkerServices = new Ajv.default({
  code: { esm: true },
}).compile(workerServiceSchema);
