/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { cp, rm, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import {
  type Node,
  stage,
  testNet,
  kras,
} from "@fluencelabs/fluence-network-environment";
import sortBy from "lodash-es/sortBy.js";
import { assert } from "vitest";

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
  DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
} from "../../src/lib/const.js";
import { setTryTimeout } from "../../src/lib/helpers/setTryTimeout.js";
import {
  LOGS_GET_ERROR_START,
  LOGS_RESOLVE_SUBNET_ERROR_START,
  stringifyUnknown,
} from "../../src/lib/helpers/utils.js";
import { addrsToNodes } from "../../src/lib/multiaddresWithoutLocal.js";
import { getAquaMainPath } from "../../src/lib/paths.js";
import { validateDeployedServicesAnswer } from "../validators/deployedServicesAnswerValidator.js";
import { validateWorkerServices } from "../validators/workerServiceValidator.js";

import { fluence } from "./commonWithSetupTests.js";
import { fluenceEnv, RUN_DEPLOYED_SERVICES_TIMEOUT } from "./constants.js";
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
            .split("\n")
            .slice(0, DEFAULT_NUMBER_OF_LOCAL_NET_NOXES),
        )
      : [];

  multiaddrs = sortBy(
    {
      mainnet: kras,
      stage,
      testnet: testNet,
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

  if (!validateDeployedServicesAnswer(runDeployedServicesResult)) {
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
  assert(dealId !== undefined, "dealId is expected to be defined");
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

  return dealId;
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

      assert.deepEqual(result, expected);
    },
    (error) => {
      console.log(
        `${RUN_DEPLOYED_SERVICES_FUNCTION_CALL} didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}`,
      );

      throw error;
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

      assert.deepEqual(sortedSubnet, expected);
    },
    (error) => {
      console.log(
        `showSubnet() didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}`,
      );

      throw error;
    },
    RUN_DEPLOYED_SERVICES_TIMEOUT,
  );
}

type WaitUntilAquaScriptReturnsExpectedArg = {
  cwd: string;
  functionName: string;
  aquaFileName: string;
  validation: (result: unknown) => never | void | Promise<void>;
  args?: string[];
};

export async function waitUntilAquaScriptReturnsExpected({
  cwd,
  functionName,
  aquaFileName,
  validation,
  args = [],
}: WaitUntilAquaScriptReturnsExpectedArg) {
  await setTryTimeout(
    "check if aqua script returns expected result",
    async () => {
      const result = JSON.parse(
        await runAquaFunction(cwd, functionName, args, {
          i: aquaFileName,
        }),
      );

      await validation(result);
    },
    (error) => {
      console.log(
        `${functionName} didn't return expected response in ${RUN_DEPLOYED_SERVICES_TIMEOUT_STR}`,
      );

      throw error;
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
