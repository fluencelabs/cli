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
import { join, resolve } from "node:path";

import { CLIError } from "@oclif/core/lib/errors/index.js";

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
} from "../src/lib/const.js";
import { execPromise } from "../src/lib/execPromise.js";
import {
  jsonStringify,
  LOGS_RESOLVE_SUBNET_ERROR_START,
  LOGS_GET_ERROR_START,
} from "../src/lib/helpers/utils.js";
import { hasKey } from "../src/lib/typeHelpers.js";

import {
  fluence,
  init,
  maybeConcurrentTest,
  sortPeers,
  assertHasWorkerAndAnswer,
  assertHasPeer,
  fluenceEnv,
} from "./helpers.js";
import { NO_PROJECT, multiaddrs } from "./setupTests.js";

const peerIds = multiaddrs
  .map(({ peerId }) => {
    return peerId;
  })
  .sort();

const EXPECTED_TS_OR_JS_RUN_RESULT = "Hello, Fluence";

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
      await Promise.resolve();
      // await fluence({
      //   args: ["local", "down"],
      // });
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

  maybeConcurrentTest("should work with ts template", async () => {
    const cwd = join("tmp", "shouldWorkWithTSTemplate");
    await init(cwd, "ts");
    await compileAqua(cwd);

    const resultOfRunningAquaUsingTSNode = (
      await execPromise({
        command: "npx",
        args: ["ts-node", getIndexJSorTSPath("ts", cwd)],
        printOutput: true,
      })
    ).trim();

    // we expect to see "Hello, Fluence" printed when running typescript code
    expect(
      resultOfRunningAquaUsingTSNode.includes(EXPECTED_TS_OR_JS_RUN_RESULT),
    ).toBe(true);
  });

  maybeConcurrentTest("should work with js template", async () => {
    const cwd = join("tmp", "shouldWorkWithJSTemplate");
    await init(cwd, "js");
    await compileAqua(cwd);

    const resultOfRunningAquaUsingNode = (
      await execPromise({
        command: "node",
        args: [getIndexJSorTSPath("js", cwd)],
        printOutput: true,
      })
    ).trim();

    // we expect to see "Hello, Fluence" printed when running javascript code
    expect(
      resultOfRunningAquaUsingNode.includes(EXPECTED_TS_OR_JS_RUN_RESULT),
    ).toBe(true);
  });

  maybeConcurrentTest("should work without project", async () => {
    const cwd = join("tmp", NO_PROJECT);
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
    "hajsldkfhsdjfhlkjsahdflk should deploy workers with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployWorkersAndRunCodeOnThem");
      await init(cwd, "minimal");

      await writeFile(
        join(cwd, "src", "aqua", "main.aqua"),
        await readFile(
          join("test", "aqua", "runDeployedWorkers.aqua"),
          FS_OPTIONS,
        ),
        FS_OPTIONS,
      );

      const pathToNewServiceDir = join("src", "services", WD_NEW_SERVICE_NAME);

      await fluence({
        args: ["service", "new", WD_NEW_SERVICE_NAME],
        cwd,
      });

      const readInterfacesFile = async () => {
        return readFile(
          join(cwd, ".fluence", "aqua", "services.aqua"),
          FS_OPTIONS,
        );
      };

      let interfacesFileContent = await readInterfacesFile();
      // we expect to a NewService interface in services.aqua file
      expect(interfacesFileContent).toBe(`${WD_NEW_SERVICE_INTERFACE}\n`);

      const newServiceConfig = await initServiceConfig(
        pathToNewServiceDir,
        cwd,
      );

      assert(
        newServiceConfig !== null,
        `we create a service at ${join(
          cwd,
          pathToNewServiceDir,
        )} above - so the config is expected to exist`,
      );

      newServiceConfig.modules.facade.envs = { A: "B" };
      await newServiceConfig.$commit();

      const NEW_SPELL_NAME = "newSpell";

      const pathToNewSpell = join("src", "spells", NEW_SPELL_NAME);

      // update first service module source code so it contains a struct

      await writeFile(
        join(
          join(cwd, "src", "services", WD_NEW_SERVICE_NAME),
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

      await fluence({
        args: ["spell", "new", NEW_SPELL_NAME],
        cwd,
      });

      const fluenceConfig = await initFluenceConfigWithPath(cwd);

      assert(
        fluenceConfig !== null,
        `We initialized the project at ${cwd} above, so the fluence config is expected to exist in that dir`,
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

      let runDeployedServicesTimeoutReached = false;
      let maybeRunDeployedError: unknown = null;

      const runDeployedServicesTimeout = setTimeout(() => {
        runDeployedServicesTimeoutReached = true;
      }, RUN_DEPLOYED_SERVICES_TIMEOUT);

      let isAttemptingToRunDeployedServices = true;

      while (isAttemptingToRunDeployedServices) {
        isAttemptingToRunDeployedServices = !runDeployedServicesTimeoutReached;

        try {
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
          clearTimeout(runDeployedServicesTimeout);
          isAttemptingToRunDeployedServices = false;
        } catch (e) {
          maybeRunDeployedError = e;
        }
      }

      // TODO: check worker logs
      // const logs = await fluence({ args: ["workers", "logs"], cwd });
      // assertLogsAreValid(logs);

      assert(
        !runDeployedServicesTimeoutReached,
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${
          maybeRunDeployedError instanceof Error
            ? maybeRunDeployedError.message
            : String(maybeRunDeployedError)
        }`,
      );

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
    "hajsldkfhsdjfhlkjsahdflk should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployDealsAndRunCodeOnThem");
      await init(cwd, "quickstart");

      await fluence({
        args: ["provider", "register"],
        flags: { "priv-key": PRIV_KEY },
        cwd,
      });

      await fluence({
        args: ["provider", "add-peer"],
        flags: { "priv-key": PRIV_KEY },
        cwd,
      });

      const pathToNewServiceDir = join("src", "services", "myService");

      const newServiceConfig = await initServiceConfig(
        pathToNewServiceDir,
        cwd,
      );

      assert(
        newServiceConfig !== null,
        `quickstart template is expected to create a service at ${join(
          cwd,
          pathToNewServiceDir,
        )} by default`,
      );

      newServiceConfig.modules.facade.envs = { A: "B" };
      await newServiceConfig.$commit();

      const pathToNewSpell = join("src", "spells", "newSpell");

      await fluence({
        args: ["spell", "new", "newSpell"],
        cwd,
      });

      const fluenceConfig = await initFluenceConfigWithPath(cwd);

      assert(
        fluenceConfig !== null,
        `every fluence template is expected to have a ${FLUENCE_CONFIG_FULL_FILE_NAME}, but found nothing at ${cwd}`,
      );

      fluenceConfig.spells = {
        newSpell: {
          get: pathToNewSpell,
        },
      };

      assert(
        fluenceConfig.deals !== undefined &&
          fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
        `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
      );

      fluenceConfig.deals[DEFAULT_DEAL_NAME].minWorkers = 3;
      fluenceConfig.deals[DEFAULT_DEAL_NAME].services = ["myService"];
      fluenceConfig.deals[DEFAULT_DEAL_NAME].spells = ["newSpell"];
      await fluenceConfig.$commit();

      await fluence({
        args: ["deal", "deploy"],
        flags: { "priv-key": PRIV_KEY },
        cwd,
      });

      let runDeployedServicesTimeoutReached = false;
      let maybeRunDeployedError: unknown = null;

      const runDeployedServicesTimeout = setTimeout(() => {
        runDeployedServicesTimeoutReached = true;
      }, RUN_DEPLOYED_SERVICES_TIMEOUT);

      let isAttemptingToRunDeployedServices = true;

      while (isAttemptingToRunDeployedServices) {
        isAttemptingToRunDeployedServices = !runDeployedServicesTimeoutReached;

        try {
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

          clearTimeout(runDeployedServicesTimeout);
          isAttemptingToRunDeployedServices = false;
        } catch (e) {
          maybeRunDeployedError = e;
        }
      }

      assert(
        !runDeployedServicesTimeoutReached,
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${
          maybeRunDeployedError instanceof Error
            ? maybeRunDeployedError.message
            : String(maybeRunDeployedError)
        }`,
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

      function isWorkerService(unknown: unknown) {
        return (
          hasKey("services", unknown) &&
          Array.isArray(unknown.services) &&
          unknown.services.every((i) => {
            return typeof i === "string";
          }) &&
          hasKey("worker_id", unknown) &&
          unknown.worker_id !== null &&
          hasKey("host_id", unknown) &&
          typeof unknown.host_id === "string"
        );
      }

      assert(
        Array.isArray(parsedShowSubnetResult) &&
          parsedShowSubnetResult.every((unknown) => {
            return isWorkerService(unknown);
          }),
        `result of running showSubnet aqua function is expected to be an array of WorkerServices, but it is: ${showSubnetResult}`,
      );

      const logs = await fluence({ args: ["deal", "logs"], cwd });

      if (logs.includes(LOGS_RESOLVE_SUBNET_ERROR_START)) {
        throw new Error(
          `Failed to resolve subnet when getting deal logs:\n\n${logs}`,
        );
      }

      assertLogsAreValid(logs);
    },
  );
});

const compileAqua = (cwd: string) => {
  return fluence({
    args: ["aqua"],
    cwd,
  });
};

const getIndexJSorTSPath = (JSOrTs: "js" | "ts", cwd: string): string => {
  return join(cwd, "src", JSOrTs, "src", `index.${JSOrTs}`);
};

const RUN_DEPLOYED_SERVICES_TIMEOUT = 1000 * 60 * 3;
// Private Key: 0x3cc23e0227bd17ea5d6ea9d42b5eaa53ad41b1974de4755c79fe236d361a6fd5
// Private Key: 0x089162470bcfc93192b95bff0a1860d063266875c782af9d882fcca125323b41
// Private Key: 0xdacd4b197ee7e9efdd5db1921c6c558d88e2c8b69902b8bafc812fb226a6b5e0
// Private Key: 0xa22813cba71d9795475e88d8d84fd3ef6e9ed4e3d5f3c34462ae1645cd1f7f16
// Private Key: 0xf96cde07b5743540fbad99faaabc7ac3158d5665f1eed0ec7ad913622b121903
// Private Key: 0xfeb277a2fb0e226a729174c44bcc7dcb94dcfef7d4c1eb77e60e83a176f812cd
// Private Key: 0xfdc4ba94809c7930fe4676b7d845cbf8fa5c1beae8744d959530e5073004cf3f
// Private Key: 0xc9b5b488586bf92ed1fe35a985b48b92392087e86da2011896c289e0010fc6bf
// Private Key: 0xe6776a7310afaffed6aeca2b54b1547d72dbfc9268ed05850584ddce53cf87a1
// Private Key: 0xb454e1649f031838a3b63b2fb693635266e048754f23cae6d9718250e3fb8905
// Private Key: 0xb8849e63d7c25960af6eaff78fd82fe916b2c20cf569aaf4fa259c15faedd146
// Private Key: 0x53513db9b03255c58b5f535e6d9e15bb3bfed583839094126b9a42ce2aa7469c
// Private Key: 0x66486a3148467413a10cc8891b657bf092d307e066a08b833b892913607aede0
// Private Key: 0x5918ecc0f743222dee4ae4f2be17965e785435af6223ad3bdff80354d893f0c2
// Private Key: 0xb76b8ce771bfccf0167c3b2a51993e7687a4d8cbfb9ced61a98f601a772bda08
// Private Key: 0xcb448613322f0ae09bb111e6bfd5be93480f1ec521b062a614f9af025c8f1852
// Private Key: 0x147840cb64e7c4ae02917144897c37b521b859ac643bf55ec83444c11c3a8a30
// Private Key: 0x1a1bf9026a097f33ce1a51f5aa0c4102e4a1432c757d922200ef37df168ae504
// Private Key: 0xbb3457514f768615c8bc4061c7e47f817c8a570c5c3537479639d4fad052a98a
// Private Key: 0xfbd9e512cc1b62db1ca689737c110afa9a3799e1bc04bf12c1c34ac39e0e2dd5

const PRIV_KEY =
  "0x089162470bcfc93192b95bff0a1860d063266875c782af9d882fcca125323b41";

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

function assertLogsAreValid(logs: string) {
  assert(logs.trim() !== "", "logs are expected to be non-empty");

  if (logs.includes(LOGS_GET_ERROR_START)) {
    throw new Error(`Failed to get deal logs:\n\n${logs}`);
  }
}
