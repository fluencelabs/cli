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
import { DEFAULT_WORKER_NAME, FS_OPTIONS } from "../src/lib/const.js";
import { execPromise } from "../src/lib/execPromise.js";
import { local } from "../src/lib/localNodes.js";

import {
  fluence,
  init,
  maybeConcurrentTest,
  multiaddrs,
  sortPeers,
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
    await addAdderServiceToFluenceYAML(cwd);

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
    await addAdderServiceToFluenceYAML(cwd);
    await compileAqua(cwd);

    expect(
      (
        await execPromise({
          command: "npx",
          args: ["ts-node", getIndexJSorTSPath("ts", cwd)],
          printOutput: true,
        })
      ).trim(),
    ).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
  });

  maybeConcurrentTest("should work with js template", async () => {
    const cwd = join("tmp", "shouldWorkWithJSTemplate");
    await init(cwd, "js");
    await addAdderServiceToFluenceYAML(cwd);
    await compileAqua(cwd);

    expect(
      (
        await execPromise({
          command: "node",
          args: [getIndexJSorTSPath("js", cwd)],
          printOutput: true,
        })
      ).trim(),
    ).toBe(EXPECTED_TS_OR_JS_RUN_RESULT);
  });

  maybeConcurrentTest("should work without project", async () => {
    const relay = multiaddrs[0]?.multiaddr;
    assert(typeof relay === "string");

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

      const NEW_SERVICE_NAME = "newService";

      const pathToNewServiceDir = join("src", "services", NEW_SERVICE_NAME);

      await fluence({
        args: ["service", "new", NEW_SERVICE_NAME],
        cwd,
      });

      const readInterfacesFile = async () => {
        return readFile(
          join(cwd, ".fluence", "aqua", "services.aqua"),
          FS_OPTIONS,
        );
      };

      let interfacesFileContent = await readInterfacesFile();

      const NEW_SERVICE_INTERFACE = `service NewService("${NEW_SERVICE_NAME}"):
  greeting(name: string) -> string
`;

      expect(interfacesFileContent).toBe(NEW_SERVICE_INTERFACE);

      const newServiceConfig = await initServiceConfig(
        pathToNewServiceDir,
        cwd,
      );

      assert(newServiceConfig !== null);
      newServiceConfig.modules.facade.envs = { A: "B" };
      await newServiceConfig.$commit();

      const NEW_SPELL_NAME = "newSpell";

      const pathToNewSpell = join("src", "spells", NEW_SPELL_NAME);

      const NEW_SERVICE_2_NAME = "newService2";

      await fluence({
        args: ["service", "new", NEW_SERVICE_2_NAME],
        cwd,
      });

      interfacesFileContent = await readInterfacesFile();

      expect(interfacesFileContent).toBe(`${NEW_SERVICE_INTERFACE}
service NewService2("${NEW_SERVICE_2_NAME}"):
  greeting(name: string) -> string
`);

      await fluence({
        args: ["spell", "new", NEW_SPELL_NAME],
        cwd,
      });

      const fluenceConfig = await initFluenceConfigWithPath(cwd);

      assert(fluenceConfig !== null);

      fluenceConfig.spells = {
        newSpell: {
          get: pathToNewSpell,
        },
      };

      const peers = [
        "12D3KooWBM3SdXWqGaawQDGQ6JprtwswEg3FWGvGhmgmMez1vRbR",
        "12D3KooWQdpukY3p2DhDfUfDgphAqsGu5ZUrmQ4mcHSGrRag6gQK",
        "12D3KooWRT8V5awYdEZm6aAV9HWweCEbhWd7df4wehqHZXAB7yMZ",
      ];

      fluenceConfig.hosts = {
        [DEFAULT_WORKER_NAME]: {
          peerIds: peers,
        },
      };

      assert(
        fluenceConfig.workers !== undefined &&
          fluenceConfig.workers[DEFAULT_WORKER_NAME] !== undefined,
      );

      fluenceConfig.workers[DEFAULT_WORKER_NAME].services = [NEW_SERVICE_NAME];
      fluenceConfig.workers[DEFAULT_WORKER_NAME].spells = [NEW_SPELL_NAME];
      await fluenceConfig.$commit();

      await fluence({
        args: ["workers", "deploy"],
        cwd,
      });

      const result = await fluence({
        args: ["run"],
        flags: {
          f: "runDeployedServices()",
          quiet: true,
        },
        cwd,
      });

      const parsedResult = JSON.parse(result);
      assert(Array.isArray(parsedResult));

      const arrayOfResults = parsedResult.map(assertHasPeer).sort(sortPeers);

      const expected = peers.map((peer) => {
        return {
          answer: "Hi, fluence",
          peer,
        };
      });

      expect(arrayOfResults).toEqual(expected);
    },
  );

  maybeConcurrentTest(
    "should deploy deals with spell and service, resolve and run services on them",
    async () => {
      const cwd = join("tmp", "shouldDeployDealsAndRunCodeOnThem");
      await init(cwd, "quickstart");
      const pathToNewServiceDir = join("src", "services", "myService");

      const newServiceConfig = await initServiceConfig(
        pathToNewServiceDir,
        cwd,
      );

      assert(newServiceConfig !== null);
      newServiceConfig.modules.facade.envs = { A: "B" };
      await newServiceConfig.$commit();

      const pathToNewSpell = join("src", "spells", "newSpell");

      await fluence({
        args: ["spell", "new", "newSpell"],
        cwd,
      });

      const fluenceConfig = await initFluenceConfigWithPath(cwd);

      assert(fluenceConfig !== null);

      fluenceConfig.spells = {
        newSpell: {
          get: pathToNewSpell,
        },
      };

      assert(
        fluenceConfig.workers !== undefined &&
          fluenceConfig.workers[DEFAULT_WORKER_NAME] !== undefined,
      );

      fluenceConfig.workers[DEFAULT_WORKER_NAME].services = ["myService"];
      fluenceConfig.workers[DEFAULT_WORKER_NAME].spells = ["newSpell"];

      await fluenceConfig.$commit();

      await fluence({
        args: [
          "deal",
          "deploy",
          "--privKey",
          "0x3cc23e0227bd17ea5d6ea9d42b5eaa53ad41b1974de4755c79fe236d361a6fd5",
          "--network",
          "local",
        ],
        cwd,
      });

      let result = "[]";

      // Jest has a global timeout for each test and if it runs out test will fail
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let res = "[]";

        try {
          res = await fluence({
            args: ["run"],
            flags: {
              f: "runDeployedServices()",
              quiet: true,
            },
            cwd,
          });
        } catch {}

        const parsedRes = JSON.parse(res);
        assert(Array.isArray(parsedRes));

        if (parsedRes.length === local.length) {
          result = res;
          break;
        }
      }

      const parsedResult = JSON.parse(result);
      assert(Array.isArray(parsedResult));

      const arrayOfResults = parsedResult.map(assertHasPeer).sort(sortPeers);

      const expected = local
        .map((peer) => {
          return {
            answer: "Hi, fluence",
            peer: peer.peerId,
          };
        })
        .sort(sortPeers);

      expect(arrayOfResults).toEqual(expected);
    },
  );
});

const addAdderServiceToFluenceYAML = (cwd: string) => {
  return fluence({
    args: [
      "service",
      "add",
      "https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true",
    ],
    cwd,
  });
};

const compileAqua = (cwd: string) => {
  return fluence({
    args: ["aqua"],
    cwd,
  });
};

const getIndexJSorTSPath = (JSOrTs: "js" | "ts", cwd: string): string => {
  return join(cwd, "src", JSOrTs, "src", `index.${JSOrTs}`);
};
