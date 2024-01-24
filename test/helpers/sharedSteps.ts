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
import { cp, rm, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import {
  krasnodar,
  type Node,
  stage,
  testNet,
} from "@fluencelabs/fluence-network-environment";
import { map, sortBy } from "lodash-es";

import {
  initFluenceConfigWithPath,
  initReadonlyFluenceConfigWithPath,
} from "../../src/lib/configs/project/fluence.js";
import { initServiceConfig } from "../../src/lib/configs/project/service.js";
import {
  DEFAULT_DEAL_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FS_OPTIONS,
  RUN_DEPLOYED_SERVICES_FUNCTION_CALL,
  RUN_DEPLOYED_SERVICES_FUNCTION_NAME,
  type Template,
  WORKER_SPELL,
} from "../../src/lib/const.js";
import {
  LOGS_GET_ERROR_START,
  LOGS_RESOLVE_SUBNET_ERROR_START,
  setTryTimeout,
  stringifyUnknown,
} from "../../src/lib/helpers/utils.js";
import { addrsToNodes } from "../../src/lib/multiaddres.js";
import { getAquaMainPath } from "../../src/lib/paths.js";
import { validateDeployedServicesAnswerSchema } from "../validators/deployedServicesAnswerValidator.js";
import { validateSpellLogs } from "../validators/spellLogsValidator.js";
import {
  validateWorkerServices,
  type WorkerServices,
} from "../validators/workerServiceValidator.js";

import { fluence } from "./commonWithSetupTests.js";
import {
  fluenceEnv,
  MY_SERVICE_NAME,
  RUN_DEPLOYED_SERVICES_TIMEOUT,
} from "./constants.js";
import { TEST_DEFAULT_SENDER_ACCOUNT } from "./localNetAccounts.js";
import {
  getInitializedTemplatePath,
  getMainRsPath,
  getModuleDirPath,
  getServiceDirPath,
  getSpellAquaPath,
  getSpellDirPath,
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
} from "./paths.js";

export const multiaddrs = await getMultiaddrs();

export async function getMultiaddrs(): Promise<Node[]> {
  const local =
    fluenceEnv === "local"
      ? addrsToNodes(
          (
            await fluence({
              args: ["default", "peers", "local"],
              cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
            })
          )
            .trim()
            .split("\n"),
        )
      : [];

  return {
    kras: krasnodar,
    stage: stage,
    testnet: testNet,
    local,
  }[fluenceEnv];
}

export const initializeTemplate = async (
  cwd: string,
  template: Template,
): Promise<void> => {
  const templatePath = getInitializedTemplatePath(template);

  await rm(cwd, { recursive: true, force: true });

  await cp(templatePath, cwd, { recursive: true });
};

export async function getFluenceConfig(cwd: string) {
  const fluenceConfig = await initFluenceConfigWithPath(cwd);

  assert(
    fluenceConfig !== null,
    `every fluence template is expected to have a ${FLUENCE_CONFIG_FULL_FILE_NAME}, but found nothing at ${cwd}`,
  );

  return fluenceConfig;
}

export async function getServiceConfig(cwd: string, serviceName: string) {
  const pathToServiceDir = getServiceDirPath(cwd, serviceName);

  const serviceConfig = await initServiceConfig(
    relative(cwd, pathToServiceDir),
    cwd,
  );

  assert(
    serviceConfig !== null,
    `the service, owning this config, must be created at the path ${pathToServiceDir}`,
  );

  return serviceConfig;
}

export async function updateFluenceConfigForTest(cwd: string) {
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

export async function updateMainRs(
  cwd: string,
  moduleName: string,
  content: string,
  serviceName?: string,
) {
  await writeFile(
    getMainRsPath(cwd, moduleName, serviceName),
    content,
    FS_OPTIONS,
  );
}

export async function updateSpellAqua(
  cwd: string,
  spellName: string,
  content: string,
) {
  await writeFile(getSpellAquaPath(cwd, spellName), content, FS_OPTIONS);
}

export async function updateMainAqua(cwd: string, content: string) {
  await writeFile(getAquaMainPath(cwd), content, FS_OPTIONS);
}

export async function build(cwd: string) {
  await fluence({ args: ["build"], cwd });
}

export async function runAquaFunction(
  cwd: string,
  functionName: string,
  functionArgs: string[] = [],
  otherFlags: Record<string, string> = {},
) {
  const args: string = functionArgs
    .map((arg) => {
      return `"${arg}"`;
    })
    .join(",");

  const flags = {
    ...otherFlags,
    f: `${functionName}(${args})`,
    quiet: true,
  };

  return fluence({
    args: ["run"],
    flags,
    cwd,
  });
}

export async function callRunDeployedServices(cwd: string) {
  const result = await runAquaFunction(
    cwd,
    RUN_DEPLOYED_SERVICES_FUNCTION_NAME,
  );

  const runDeployedServicesResult = JSON.parse(result);

  if (!validateDeployedServicesAnswerSchema(runDeployedServicesResult)) {
    throw new Error(
      `result of running ${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} aqua function is expected to be an array of DeployedServicesAnswer, but actual result is: ${result}`,
    );
  }

  return runDeployedServicesResult;
}

export async function deployDealAndWaitUntilDeployed(cwd: string) {
  const res = await fluence({
    args: ["deal", "deploy"],
    flags: {
      "priv-key": TEST_DEFAULT_SENDER_ACCOUNT.privateKey,
    },
    cwd,
  });

  const dealId = res
    .split("deal: https://mumbai.polygonscan.com/address/")[1]
    ?.split("\n")[0];

  assert(dealId, "dealId is expected to be defined");
  console.log("dealId:", dealId);

  await fluence({
    args: ["deal", "deposit", dealId, "1"],
    flags: {
      "priv-key": TEST_DEFAULT_SENDER_ACCOUNT.privateKey,
    },
    cwd,
  });

  await setTryTimeout(
    async () => {
      return callRunDeployedServices(cwd);
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

export async function createSpellAndAddToDeal(cwd: string, spellName: string) {
  await fluence({
    args: ["spell", "new", spellName],
    cwd,
  });

  const fluenceConfig = await getFluenceConfig(cwd);

  assert(
    fluenceConfig.deals !== undefined &&
      fluenceConfig.deals[DEFAULT_DEAL_NAME] !== undefined,
    `${DEFAULT_DEAL_NAME} is expected to be in deals property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  fluenceConfig.spells = {
    [spellName]: {
      get: relative(cwd, getSpellDirPath(cwd, spellName)),
    },
  };

  fluenceConfig.deals[DEFAULT_DEAL_NAME].spells = [spellName];
  await fluenceConfig.$commit();
}

export async function createServiceAndAddToDeal(
  cwd: string,
  serviceName: string,
) {
  await fluence({
    args: ["service", "new", serviceName],
    cwd,
  });

  const updatedReadonlyConfig = await waitUntilFluenceConfigUpdated(
    cwd,
    serviceName,
  );

  const fluenceConfig = await getFluenceConfig(cwd);

  assert(
    updatedReadonlyConfig.services !== undefined,
    `services property is expected to be in ${updatedReadonlyConfig.$getPath()} after ${serviceName} is added to it`,
  );

  const readonlyServices = updatedReadonlyConfig.services[serviceName];
  assert(readonlyServices !== undefined);

  fluenceConfig.services = {
    ...fluenceConfig.services,
    [serviceName]: readonlyServices,
  };

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

export async function createModuleAndAddToService(
  cwd: string,
  moduleName: string,
  serviceName: string,
) {
  await fluence({
    args: ["module", "new", moduleName],
    cwd,
  });

  const serviceConfig = await getServiceConfig(cwd, serviceName);

  const relativePathToNewModule = relative(
    getServiceDirPath(cwd, serviceName),
    getModuleDirPath(cwd, moduleName),
  );

  serviceConfig.modules = {
    ...serviceConfig.modules,
    [moduleName]: {
      get: relativePathToNewModule,
    },
  };

  await serviceConfig.$commit();
}

async function waitUntilFluenceConfigUpdated(cwd: string, serviceName: string) {
  const checkConfig = async () => {
    const config = await initReadonlyFluenceConfigWithPath(cwd);

    assert(config !== null, `config is expected to exist at ${cwd}`);

    assert(
      config.services !== undefined &&
        Object.prototype.hasOwnProperty.call(config.services, serviceName),
      `${serviceName} is expected to be in services property of ${config.$getPath()} after ${serviceName} is added to it`,
    );

    return config;
  };

  return setTryTimeout(
    checkConfig,
    (error) => {
      throw new Error(
        `Config is expected to be updated after ${serviceName} is added to it, error: ${stringifyUnknown(
          error,
        )}`,
      );
    },
    5000,
  );
}

export async function waitUntilRunDeployedServicesReturnsExpected(
  cwd: string,
  answer: string,
) {
  await setTryTimeout(
    async () => {
      const runDeployedServicesResult = await callRunDeployedServices(cwd);

      const expected = sortBy(
        map(multiaddrs, (peer) => {
          return {
            answer,
            peer: peer.peerId,
          };
        }),
        ["peer"],
      );

      const result = sortBy(
        map(runDeployedServicesResult, ({ answer, worker }) => {
          return {
            answer,
            peer: worker.host_id,
          };
        }),
        ["peer"],
      );

      expect(result).toEqual(expected);
    },
    (error) => {
      throw new Error(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${stringifyUnknown(
          error,
        )}`,
      );
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT,
  );
}

function sortSubnetResult(result: WorkerServices) {
  const sortedResult = sortBy(result, ["host_id"]);

  map(sortedResult, (w) => {
    return w.services.sort();
  });

  map(sortedResult, (w) => {
    return w.spells.sort();
  });

  return sortedResult;
}

export async function waitUntilShowSubnetReturnsExpected(
  cwd: string,
  services: string[],
  spells: string[],
) {
  await setTryTimeout(
    async () => {
      const showSubnetResult = await runAquaFunction(cwd, "showSubnet");

      const subnet = JSON.parse(showSubnetResult);

      if (!validateWorkerServices(subnet)) {
        throw new Error(
          `result of running showSubnet aqua function is expected to be an array of WorkerServices, but it is: ${showSubnetResult}`,
        );
      }

      const sortedSubnet = sortSubnetResult(subnet);

      const expected = map(
        sortBy(
          map(multiaddrs, ({ peerId }) => {
            return peerId;
          }),
        ),
        (host_id, i) => {
          return {
            host_id,
            services,
            spells: [...spells, WORKER_SPELL].sort(),
            worker_id: sortedSubnet[i]?.worker_id,
          };
        },
      );

      expect(sortedSubnet).toEqual(expected);
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

export async function waitUntilAquaScriptReturnsExpected(
  cwd: string,
  spellName: string,
  functionName: string,
  aquaFileName: string,
  answer: string,
) {
  await setTryTimeout(
    async () => {
      const result = await runAquaFunction(cwd, functionName, [spellName], {
        i: aquaFileName,
      });

      const spellLogs = JSON.parse(result);

      if (!validateSpellLogs(spellLogs)) {
        throw new Error(
          `result of running ${functionName} aqua function has unexpected structure: ${validateSpellLogs.errors?.toString()}`,
        );
      }

      spellLogs[0].forEach((w) => {
        assert(
          w.logs.length > 0,
          `Worker ${w.worker_id} doesn't have any logs`,
        );

        const lastLogMessage = w.logs[w.logs.length - 1]?.message;

        assert(
          lastLogMessage === answer,
          `Worker ${w.worker_id} last log message is expected to be ${answer}, but it is ${lastLogMessage}`,
        );
      });

      assert(spellLogs[1].length === 0, `Errors: ${spellLogs[1].join("\n")}`);
    },
    (error) => {
      throw new Error(
        `${functionName} didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT}ms, error: ${stringifyUnknown(
          error,
        )}`,
      );
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT,
  );
}

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
