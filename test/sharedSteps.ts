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
import { join, relative } from "node:path";

import Ajv from "ajv";

import {
  type FluenceConfig,
  initFluenceConfigWithPath,
} from "../src/lib/configs/project/fluence.js";
import { initServiceConfig } from "../src/lib/configs/project/service.js";
import {
  DEFAULT_DEAL_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  LOCAL_NET_DEFAULT_WALLET_KEY,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
} from "../src/lib/const.js";
import {
  jsonStringify,
  LOGS_GET_ERROR_START,
  LOGS_RESOLVE_SUBNET_ERROR_START,
  setTryTimeout,
  stringifyUnknown,
} from "../src/lib/helpers/utils.js";
import { getServicesDir, getSpellsDir } from "../src/lib/paths.js";

import {
  RUN_DEPLOYED_SERVICES_TIMEOUT,
  WORKER_SPELL,
  type WorkerServices,
  workerServiceSchema,
} from "./constants.js";
import {
  assertHasWorkerAndAnswer,
  fluence,
  getMultiaddrs,
  sortPeers,
} from "./helpers.js";

export async function getFluenceConfig(cwd: string) {
  const fluenceConfig = await initFluenceConfigWithPath(cwd);

  assert(
    fluenceConfig !== null,
    `every fluence template is expected to have a ${FLUENCE_CONFIG_FULL_FILE_NAME}, but found nothing at ${cwd}`,
  );

  return fluenceConfig;
}

export async function build(cwd: string) {
  await fluence({ args: ["build"], cwd });
}

export async function deployDealAndWaitUntilDeployed(cwd: string) {
  const res = await fluence({
    args: ["deal", "deploy"],
    flags: {
      "priv-key": LOCAL_NET_DEFAULT_WALLET_KEY,
    },
    cwd,
  });

  const dealId = res
    .split("deal: https://mumbai.polygonscan.com/address/")[1]
    ?.split("\n")[0];

  assert(dealId);
  console.log(dealId);

  await fluence({
    args: ["deal", "deposit", dealId, "100000000000000000000"],
    flags: {
      "priv-key": LOCAL_NET_DEFAULT_WALLET_KEY,
    },
    cwd,
  });

  await setTryTimeout(
    async () => {
      return waitUntilDealDeployed(cwd);
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
}

async function waitUntilDealDeployed(cwd: string) {
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

  const multiaddrs = await getMultiaddrs();

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

export async function createSpellAndAddToDeal(
  cwd: string,
  fluenceConfig: FluenceConfig,
  spellName: string,
) {
  await fluence({
    args: ["spell", "new", spellName],
    cwd,
  });

  assert(
    fluenceConfig.deals !== undefined &&
      fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
    `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  const pathToNewSpell = join(getSpellsDir(cwd), spellName);

  fluenceConfig.spells = {
    [spellName]: {
      get: relative(cwd, pathToNewSpell),
    },
  };

  fluenceConfig.deals[DEFAULT_DEAL_NAME].spells = [spellName];
  await fluenceConfig.$commit();
}

function sortSubnetResult(result: WorkerServices) {
  return result
    .sort((a, b) => {
      if (a.host_id < b.host_id) {
        return -1;
      }

      if (a.host_id > b.host_id) {
        return 1;
      }

      return 0;
    })
    .map((w) => {
      return w.spells.sort();
    });
}

export async function waitUntilShowSubnetReturnsExpected(
  cwd: string,
  services: string[],
  spells: string[],
) {
  await setTryTimeout(
    async () => {
      const showSubnetResult = await fluence({
        args: ["run"],
        flags: {
          f: "showSubnet()",
          quiet: true,
        },
        cwd,
      });

      const subnet = JSON.parse(showSubnetResult);

      if (!validateWorkerServices(subnet)) {
        throw new Error(
          `result of running showSubnet aqua function is expected to be an array of WorkerServices, but it is: ${showSubnetResult}`,
        );
      }

      sortSubnetResult(subnet);
      const multiaddrs = await getMultiaddrs();

      const expected = multiaddrs
        .map(({ peerId }) => {
          return peerId;
        })
        .sort()
        .map((host_id, i) => {
          return {
            host_id,
            services,
            spells: [...spells, WORKER_SPELL],
            worker_id: subnet[i]?.worker_id,
          };
        });

      expect(subnet).toEqual(expected);
    },
    (error) => {
      throw new Error(
        `showSubnet() didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${stringifyUnknown(
          error,
        )}`,
      );
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT,
  );
}

const validateWorkerServices = new Ajv.default({
  code: { esm: true },
}).compile(workerServiceSchema);

export function assertLogsAreValid(logs: string) {
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

export async function getServiceConfig(cwd: string, serviceName: string) {
  const pathToServiceDir = join(getServicesDir(cwd), serviceName);

  const serviceConfig = await initServiceConfig(
    relative(cwd, pathToServiceDir),
    cwd,
  );

  assert(
    serviceConfig !== null,
    `we create a service at ${pathToServiceDir} above - so the config is expected to exist`,
  );

  return serviceConfig;
}

// TODO: Fix the problem with initialization of mutable config
async function waitUntilFluenceConfigUpdated(cwd: string, serviceName: string) {
  const checkConfig = async () => {
    console.log("checking config", Date.now());
    const config = await getFluenceConfig(cwd);
    console.log("config", JSON.stringify(config, null, 2));

    expect(
      config.services !== undefined &&
        Object.prototype.hasOwnProperty.call(config.services, serviceName),
    ).toBeTruthy();

    return config;
  };

  return await setTryTimeout(
    checkConfig,
    (error) => {
      throw new Error(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${stringifyUnknown(
          error,
        )}`,
      );
    },
    5000,
  );
}

export async function createServiceAndAddToDeal(
  cwd: string,
  serviceName: string,
) {
  await fluence({
    args: ["service", "new", serviceName],
    cwd,
  });

  const fluenceConfig = await waitUntilFluenceConfigUpdated(cwd, serviceName);

  assert(
    fluenceConfig.deals !== undefined &&
      fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
    `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  const currentServices = fluenceConfig.deals[DEFAULT_DEAL_NAME].services ?? [];

  fluenceConfig.deals[DEFAULT_DEAL_NAME].services = [
    ...currentServices,
    serviceName,
  ];

  await fluenceConfig.$commit();
}
