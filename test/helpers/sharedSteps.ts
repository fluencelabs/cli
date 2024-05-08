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

import assert from "node:assert";
import { cp, rm, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import {
  type Node,
  stage,
  testNet,
  kras,
} from "@fluencelabs/fluence-network-environment";
import sortBy from "lodash-es/sortBy.js";
import { expect } from "vitest";

import { validationErrorToString } from "../../src/lib/ajvInstance.js";
import {
  initFluenceConfigWithPath,
  initReadonlyFluenceConfigWithPath,
} from "../../src/lib/configs/project/fluence.js";
import { initServiceConfig } from "../../src/lib/configs/project/service.js";
import {
  DEFAULT_DEPLOYMENT_NAME,
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
import { addrsToNodes } from "../../src/lib/multiaddresWithoutLocal.js";
import { getAquaMainPath } from "../../src/lib/paths.js";
import { validateDeployedServicesAnswerSchema } from "../validators/deployedServicesAnswerValidator.js";
import { validateSpellLogs } from "../validators/spellLogsValidator.js";
import { validateWorkerServices } from "../validators/workerServiceValidator.js";

import { fluence } from "./commonWithSetupTests.js";
import {
  fluenceEnv,
  MY_SERVICE_NAME,
  RUN_DEPLOYED_SERVICES_TIMEOUT,
} from "./constants.js";
import { RUN_DEPLOYED_SERVICES_TIMEOUT_STR } from "./constants.js";
import {
  getInitializedTemplatePath,
  getMainRsPath,
  getModuleDirPath,
  getServiceDirPath,
  getSpellAquaPath,
  getSpellDirPath,
} from "./paths.js";

let multiaddrs: Node[] | undefined;

export async function getMultiaddrs(cwd: string): Promise<Node[]> {
  if (multiaddrs !== undefined) {
    return multiaddrs;
  }

  const local =
    fluenceEnv === "local"
      ? addrsToNodes(
          (
            await fluence({
              args: ["default", "peers", "local"],
              cwd,
            })
          )
            .trim()
            .split("\n"),
        )
      : [];

  multiaddrs = sortBy(
    {
      kras,
      stage,
      dar: testNet,
      local,
    }[fluenceEnv],
    ["peerId"],
  );

  return multiaddrs;
}

export async function getPeerIds(cwd: string): Promise<string[]> {
  return (await getMultiaddrs(cwd)).map(({ peerId }) => {
    return peerId;
  });
}

export async function initializeTemplate(
  cwd: string,
  template: Template,
): Promise<void> {
  const templatePath = getInitializedTemplatePath(template);
  await rm(cwd, { recursive: true, force: true });
  await cp(templatePath, cwd, { recursive: true });

  // so that each test has it's own key for fluence-js
  await fluence({
    args: ["key", "new", "defaultKey", "--default"],
    cwd,
  });
}

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
    fluenceConfig.deployments !== undefined &&
      fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME] !== undefined,
    `${DEFAULT_DEPLOYMENT_NAME} is expected to be in deployments property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME].targetWorkers = 3;

  fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME].services = [
    MY_SERVICE_NAME,
  ];

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

export async function deployDealAndWaitUntilDeployed(
  cwd: string,
  update = false,
) {
  const res = await fluence({
    args: ["deploy", DEFAULT_DEPLOYMENT_NAME],
    flags: { update },
    cwd,
  });

  const dealId = res.split('DealID: "')[1]?.split('"')[0];

  assert(dealId, "dealId is expected to be defined");
  console.log("DealID:", dealId);

  await setTryTimeout(
    "run deployed services",
    () => {
      return callRunDeployedServices(cwd);
    },
    (error) => {
      throw new Error(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't run successfully in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}, error: ${stringifyUnknown(
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
    fluenceConfig.deployments !== undefined &&
      fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME] !== undefined,
    `${DEFAULT_DEPLOYMENT_NAME} is expected to be in deployments property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  fluenceConfig.spells = {
    [spellName]: {
      get: relative(cwd, getSpellDirPath(cwd, spellName)),
    },
  };

  fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME].spells = [spellName];
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
    fluenceConfig.deployments !== undefined &&
      fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME] !== undefined,
    `${DEFAULT_DEPLOYMENT_NAME} is expected to be in deployments property of ${fluenceConfig.$getPath()} by default when the project is initialized`,
  );

  const currentServices =
    fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME].services ?? [];

  fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME].services = [
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
  return setTryTimeout(
    "get updated fluence config",
    async () => {
      const config = await initReadonlyFluenceConfigWithPath(cwd);

      assert(config !== null, `config is expected to exist at ${cwd}`);

      assert(
        config.services !== undefined &&
          Object.prototype.hasOwnProperty.call(config.services, serviceName),
        `${serviceName} is expected to be in services property of ${config.$getPath()} after ${serviceName} is added to it`,
      );

      return config;
    },
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
    "check if runDeployedServices returns expected result",
    async () => {
      const expected = (await getMultiaddrs(cwd)).map(({ peerId }) => {
        return {
          answer,
          peerId,
        };
      });

      const result = sortBy(
        (await callRunDeployedServices(cwd)).map(
          ({ answer, worker: { host_id: peerId } }) => {
            return {
              answer,
              peerId,
            };
          },
        ),
        ["peerId"],
      );

      expect(result).toEqual(expected);
    },
    (error) => {
      throw new Error(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}, error: ${stringifyUnknown(
          error,
        )}`,
      );
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT,
  );
}

export async function waitUntilShowSubnetReturnsExpected(
  cwd: string,
  services: string[],
  spells: string[],
) {
  await setTryTimeout(
    "check if showSubnet returns expected result",
    async () => {
      const showSubnetResult = await runAquaFunction(cwd, "showSubnet");
      const subnet = JSON.parse(showSubnetResult);

      if (!validateWorkerServices(subnet)) {
        throw new Error(
          `result of running showSubnet aqua function is expected to be an array of WorkerServices, but it is: ${showSubnetResult}`,
        );
      }

      const sortedSubnet = sortBy(subnet, ["host_id"]).map((w) => {
        w.services.sort();
        w.spells.sort();
        return w;
      });

      const expected = (await getPeerIds(cwd)).map((host_id, i) => {
        return {
          host_id,
          services,
          spells: [...spells, WORKER_SPELL].sort(),
          worker_id: sortedSubnet[i]?.worker_id,
        };
      });

      expect(sortedSubnet).toEqual(expected);
    },
    (error) => {
      throw new Error(
        `showSubnet() didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}, error: ${stringifyUnknown(
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
    "check if aqua script returns expected result",
    async () => {
      const result = await runAquaFunction(cwd, functionName, [spellName], {
        i: aquaFileName,
      });

      const spellLogs = JSON.parse(result);

      if (!validateSpellLogs(spellLogs)) {
        throw new Error(
          `result of running ${functionName} aqua function has unexpected structure: ${await validationErrorToString(validateSpellLogs.errors)}`,
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
          `Worker ${w.worker_id} last log message is expected to be ${answer}, but it is ${lastLogMessage === undefined ? "undefined" : lastLogMessage}`,
        );
      });

      assert(spellLogs[1].length === 0, `Errors: ${spellLogs[1].join("\n")}`);
    },
    (error) => {
      throw new Error(
        `${functionName} didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}, error: ${stringifyUnknown(
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

export async function stopDefaultDeal(cwd: string) {
  await fluence({
    args: ["deal", "stop", DEFAULT_DEPLOYMENT_NAME],
    cwd,
  });
}
