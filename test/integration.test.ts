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

import { CLIError } from "@oclif/core/lib/errors/index.js";

import {
  setCommandObjAndIsInteractive,
  type CommandObj,
} from "../src/lib/commandObj.js";
import { initFluenceConfigWithPath } from "../src/lib/configs/project/fluence.js";
import { initServiceConfig } from "../src/lib/configs/project/service.js";
import {
  DEFAULT_WORKER_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FS_OPTIONS,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
} from "../src/lib/const.js";
import { execPromise } from "../src/lib/execPromise.js";
import { jsonStringify } from "../src/lib/helpers/jsonStringify.js";
import { localPeerIds, local } from "../src/lib/localNodes.js";

import {
  fluence,
  init,
  maybeConcurrentTest,
  multiaddrs,
  sortPeers,
  assertHasWorkerAndAnswer,
  assertHasPeer,
} from "./helpers.js";

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
    expect(resultOfRunningAquaUsingTSNode).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
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
    expect(resultOfRunningAquaUsingNode).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
  });

  maybeConcurrentTest("should work without project", async () => {
    const relay = multiaddrs[0]?.multiaddr;

    assert(
      typeof relay === "string",
      "multiaddrs is expected to be a non empty array",
    );

    const result = await fluence({
      args: ["run"],
      flags: {
        relay,
        f: "identify()",
        i: join("test", "aqua", "smoke.aqua"),
        quiet: true,
      },
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
          peerIds: localPeerIds,
        },
      };

      assert(
        fluenceConfig.workers !== undefined &&
          fluenceConfig.workers[DEFAULT_WORKER_NAME] !== undefined,
        `${DEFAULT_WORKER_NAME} is expected to be in workers property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
      );

      fluenceConfig.workers[DEFAULT_WORKER_NAME].services = [
        WD_NEW_SERVICE_2_NAME,
      ];

      fluenceConfig.workers[DEFAULT_WORKER_NAME].spells = [NEW_SPELL_NAME];
      await fluenceConfig.$commit();

      await fluence({
        args: ["workers", "deploy"],
        cwd,
      });

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
        `result of running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} is expected to be an array but it is: ${result}`,
      );

      const arrayOfResults = parsedResult.map(assertHasPeer).sort(sortPeers);

      const expected = localPeerIds.map((peer) => {
        return {
          answer: "Hi, fluence",
          peer,
        };
      });

      // running the deployed services is expected to return a result from each of the localPeers we deployed to
      expect(arrayOfResults).toEqual(expected);
    },
  );

  maybeConcurrentTest(
    "should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployDealsAndRunCodeOnThem");
      await init(cwd, "quickstart");

      await fluence({
        args: ["market", "register"],
        flags: {
          network: "local",
          "priv-key": PRIV_KEY,
        },
        cwd,
      });

      const peerIdFlags = localPeerIds.flatMap((peerId) => {
        return ["--peer-id", peerId];
      });

      await fluence({
        args: ["market", "add-peer", ...peerIdFlags],
        flags: {
          network: "local",
          "priv-key": PRIV_KEY,
          slots: 1,
        },
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
        fluenceConfig.workers !== undefined &&
          fluenceConfig.workers[DEFAULT_WORKER_NAME] !== undefined,
        `${DEFAULT_WORKER_NAME} is expected to be in workers property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
      );

      fluenceConfig.workers[DEFAULT_WORKER_NAME].services = ["myService"];
      fluenceConfig.workers[DEFAULT_WORKER_NAME].spells = ["newSpell"];

      assert(
        fluenceConfig.deals !== undefined &&
          fluenceConfig.deals[DEFAULT_WORKER_NAME] !== undefined,
        `${DEFAULT_WORKER_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
      );

      fluenceConfig.deals[DEFAULT_WORKER_NAME].minWorkers = 3;

      await fluenceConfig.$commit();

      await fluence({
        args: ["deal", "deploy"],
        flags: {
          "priv-key": PRIV_KEY,
          network: "local",
        },
        cwd,
      });

      let result = "[]";
      let runDeployedServicesTimeoutReached = false;
      let maybeRunDeployedError: unknown = null;

      const runDeployedServicesTimeout = setTimeout(() => {
        runDeployedServicesTimeoutReached = true;
      }, RUN_DEPLOYED_SERVICES_TIMEOUT);

      while (!runDeployedServicesTimeoutReached) {
        try {
          result = await fluence({
            args: ["run"],
            flags: {
              f: RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
              quiet: true,
            },
            cwd,
          });

          clearTimeout(runDeployedServicesTimeout);
          break;
        } catch (e) {
          maybeRunDeployedError = e;
          continue;
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

      const parsedResult = JSON.parse(result);

      assert(
        Array.isArray(parsedResult),
        `result of running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is expected to be an array, but it is: ${result}`,
      );

      const arrayOfResults = parsedResult.map(assertHasWorkerAndAnswer);

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

      const expected = local
        .map((peer) => {
          return {
            answer: "Hi, fluence",
            peer: peer.peerId,
          };
        })
        .sort(sortPeers);

      const res = arrayOfResults
        .map(({ answer, worker }) => {
          return {
            answer,
            peer: worker.host_id,
          };
        })
        .sort(sortPeers);

      // We expect to have one result from each of the local peers, because we requested 3 workers and we have 3 local peers
      expect(res).toEqual(expected);
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

const RUN_DEPLOYED_SERVICES_TIMEOUT = 1000 * 60 * 5;

const PRIV_KEY =
  "0xfdc4ba94809c7930fe4676b7d845cbf8fa5c1beae8744d959530e5073004cf3f";

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
