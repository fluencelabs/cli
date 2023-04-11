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
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { compile } from "./aqua.js";
import { buildModules } from "./build.js";
import { commandObj } from "./commandObj.js";
import type { Upload_deployArgConfig } from "./compiled-aqua/installation-spell/cli.js";
import type { InitializedReadonlyConfig } from "./configs/initConfig.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  type ConfigV0,
  initReadonlyModuleConfig,
} from "./configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
} from "./configs/project/service.js";
import {
  initReadonlySpellConfig,
  resolveEndSec,
  resolveStartSec,
} from "./configs/project/spell.js";
import type { WorkersConfigReadonly } from "./configs/project/workers.js";
import { FLUENCE_CONFIG_FILE_NAME, FS_OPTIONS } from "./const.js";
import {
  downloadModule,
  getModuleWasmPath,
  getUrlOrAbsolutePath,
  isUrl,
} from "./helpers/downloadFile.js";
import { jsToAqua } from "./helpers/jsToAqua.js";
import { moduleToJSONModuleConfig } from "./helpers/moduleToJSONModuleConfig.js";
import { initMarineCli } from "./marineCli.js";
import { ensureFluenceAquaWorkersPath, projectRootDir } from "./paths.js";
import { checkboxes } from "./prompt.js";
import { spellInstallAirScript } from "./spellAir.js";

export const parseWorkers = (workerNamesString: string) =>
  workerNamesString.split(",").map((s) => s.trim());

const handlePreviouslyDeployedWorkers = async (
  maybeDeployedHostsOrDeals:
    | WorkersConfigReadonly["deals"]
    | WorkersConfigReadonly["hosts"]
    | undefined,
  workersToDeploy: Array<string>
) => {
  if (maybeDeployedHostsOrDeals === undefined) {
    return workersToDeploy;
  }

  const previouslyDeployedWorkersNames = Object.keys(maybeDeployedHostsOrDeals);

  const previouslyDeployedWorkersNamesToBeDeployed = workersToDeploy.filter(
    (workerName) => previouslyDeployedWorkersNames.includes(workerName)
  );

  if (previouslyDeployedWorkersNamesToBeDeployed.length === 0) {
    return workersToDeploy;
  }

  const confirmedWorkersNamesToDeploy = await checkboxes({
    message: `These are the workers that were previously deployed. Please select the ones you want to redeploy.`,
    options: previouslyDeployedWorkersNamesToBeDeployed,
    oneChoiceMessage(workerName) {
      return `Do you want to redeploy worker ${color.yellow(workerName)}`;
    },
    onNoChoices(): Array<string> {
      return [];
    },
  });

  const workerNamesToRemove = previouslyDeployedWorkersNamesToBeDeployed.filter(
    (workerName) => !confirmedWorkersNamesToDeploy.includes(workerName)
  );

  if (workerNamesToRemove.length === 0) {
    return workersToDeploy;
  }

  return workersToDeploy.filter(
    (workerName) => !workerNamesToRemove.includes(workerName)
  );
};

type PrepareForDeployArg = {
  workerNames: string | undefined;
  fluenceConfig: FluenceConfig;
  aquaImports: Array<string>;
  maybeWorkersConfig?: WorkersConfigReadonly;
  hosts?: boolean;
};

export const prepareForDeploy = async ({
  workerNames: workerNamesString,
  fluenceConfig,
  aquaImports,
  maybeWorkersConfig,
  hosts = false,
}: PrepareForDeployArg): Promise<Upload_deployArgConfig> => {
  const hostsOrDealsString = hosts ? "hosts" : "deals";

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const hostsOrDeals = Object.entries(
    fluenceConfig[hostsOrDealsString] ??
      commandObj.error(
        `You must have a ${color.yellow(
          hostsOrDealsString
        )} property in ${FLUENCE_CONFIG_FILE_NAME} that contains a record with at least one worker name as a key`
      )
  ) as Array<
    [
      string,
      (
        | (typeof fluenceConfig.hosts)[keyof typeof fluenceConfig.hosts]
        | (typeof fluenceConfig.deals)[keyof typeof fluenceConfig.deals]
      )
    ]
  >;

  const maybeDeployedHostsOrDeals = (maybeWorkersConfig ?? {})[
    hostsOrDealsString
  ];

  const workerNamesSet = hostsOrDeals.map(([workerName]) => workerName);

  const workersToDeploy =
    workerNamesString === undefined
      ? workerNamesSet
      : parseWorkers(workerNamesString);

  if (workersToDeploy.length === 0) {
    return commandObj.error(
      `${color.yellow(
        hostsOrDealsString
      )} record in ${FLUENCE_CONFIG_FILE_NAME} must contain at least one worker name as a key`
    );
  }

  const { services: servicesFromFluenceConfig = {} } = fluenceConfig;
  const { workers: workersFromFluenceConfig = {} } = fluenceConfig;

  const workersFromFluenceConfigArray = Object.keys(workersFromFluenceConfig);

  if (workersFromFluenceConfigArray.length === 0) {
    return commandObj.error(
      `You must have a ${color.yellow(
        "workers"
      )} property in ${FLUENCE_CONFIG_FILE_NAME} that contains a record with at least one worker name as a key`
    );
  }

  const workerNamesNotFoundInWorkersConfig = workersToDeploy.filter(
    (workerName) => !workersFromFluenceConfigArray.includes(workerName)
  );

  if (workerNamesNotFoundInWorkersConfig.length !== 0) {
    commandObj.error(
      `Wasn't able to find workers ${workerNamesNotFoundInWorkersConfig
        .map((workerName) => color.yellow(workerName))
        .join(", ")} in ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )} please check the spelling and try again`
    );
  }

  const workersToDeployConfirmed = await handlePreviouslyDeployedWorkers(
    maybeDeployedHostsOrDeals,
    workersToDeploy
  );

  const workerConfigs = workersToDeployConfirmed.map((workerName) => {
    const workerConfig = workersFromFluenceConfig[workerName];

    assert(
      workerConfig !== undefined,
      `Unreachable. workerNamesNotFoundInWorkersConfig was empty but error still happened. Looking for ${workerName} in ${JSON.stringify(
        workersFromFluenceConfig
      )}`
    );

    if (
      (workerConfig.services ?? []).length === 0 &&
      (workerConfig.spells ?? []).length === 0
    ) {
      return commandObj.error(
        `All workers must have at least one service or spell. Worker ${color.yellow(
          workerName
        )} listed in ${FLUENCE_CONFIG_FILE_NAME} ${color.yellow(
          "workers"
        )} property does not have any spells or services`
      );
    }

    return {
      workerName,
      workerConfig,
    };
  });

  const spellNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => workerConfig.spells ?? [])
    ),
  ];

  const spellConfigs = await Promise.all(
    spellNames.map(async (name) => {
      const maybeSpell = fluenceConfig.spells?.[name];

      assert(
        maybeSpell !== undefined,
        `Unreachable. can't find spell ${name} from workers property in ${FLUENCE_CONFIG_FILE_NAME} in spells property. This has to be checked on config init. Looking for ${name} in ${JSON.stringify(
          fluenceConfig.spells
        )}`
      );

      const { get, ...spellOverridesFromFluenceConfig } = maybeSpell;

      const spellConfig = await initReadonlySpellConfig(get, projectRootDir);

      if (spellConfig === null) {
        return commandObj.error(
          isUrl(get)
            ? `Downloaded invalid spell ${color.yellow(name)}`
            : `Invalid spell ${color.yellow(name)} at ${color.yellow(get)}`
        );
      }

      const overriddenSpellConfig = {
        ...spellConfig,
        ...spellOverridesFromFluenceConfig,
      };

      const spellAquaFilePath = resolve(
        spellConfig.$getDirPath(),
        spellConfig.aquaFilePath
      );

      const { errors, functions } = await compile({
        filePath: spellAquaFilePath,
        imports: aquaImports,
      });

      if (errors.length > 0) {
        commandObj.error(
          `Failed to compile aqua file with spell at ${color.yellow(
            spellAquaFilePath
          )}:\n\n${errors.join("\n")}`
        );
      }

      const { script } = functions[spellConfig.function] ?? {};

      if (script === undefined) {
        commandObj.error(
          `Failed to find spell function ${color.yellow(
            spellConfig.function
          )} in aqua file at ${color.yellow(spellAquaFilePath)}`
        );
      }

      return {
        name,
        config: {
          blockchain: { end_block: 0, start_block: 0 },
          connections: { connect: false, disconnect: false },
          clock:
            overriddenSpellConfig.clock?.periodSec === undefined
              ? {
                  start_sec: 0,
                  end_sec: 0,
                  period_sec: 0,
                }
              : {
                  start_sec: resolveStartSec(overriddenSpellConfig),
                  end_sec: resolveEndSec(overriddenSpellConfig),
                  period_sec: overriddenSpellConfig.clock.periodSec,
                },
        },
        script,
        init_args: overriddenSpellConfig.initArgs ?? {},
      };
    })
  );

  const serviceNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => workerConfig.services ?? [])
    ),
  ];

  const serviceConfigs = await Promise.all(
    serviceNames.map(async (serviceName) => {
      const maybeService = servicesFromFluenceConfig[serviceName];

      assert(
        maybeService !== undefined,
        `Unreachable. can't find service ${serviceName} from workers property in ${FLUENCE_CONFIG_FILE_NAME} in services property. This has to be checked on config init. Looking for ${serviceName} in ${JSON.stringify(
          servicesFromFluenceConfig
        )}`
      );

      const { get, overrideModules } = maybeService;

      const serviceConfig = await initReadonlyServiceConfig(
        get,
        projectRootDir
      );

      if (serviceConfig === null) {
        return commandObj.error(
          isUrl(get)
            ? `Downloaded invalid service ${color.yellow(
                serviceName
              )} from ${color.yellow(get)}`
            : `Invalid service ${color.yellow(serviceName)} at ${color.yellow(
                get
              )}`
        );
      }

      return {
        serviceName,
        overrideModules,
        serviceConfig,
      };
    })
  );

  const modulesUrls = [
    ...new Set(
      serviceConfigs
        .flatMap(({ serviceConfig }) =>
          Object.values(serviceConfig.modules).map(({ get }) => get)
        )
        .filter((get) => isUrl(get))
    ),
  ];

  const downloadedModulesMap = new Map<string, string>(
    await Promise.all(
      modulesUrls.map(
        async (url): Promise<[string, string]> => [
          url,
          await downloadModule(url),
        ]
      )
    )
  );

  const localModuleAbsolutePaths = serviceConfigs
    .flatMap(({ serviceConfig }) =>
      Object.values(serviceConfig.modules).map(({ get }) => ({
        get,
        serviceDirPath: serviceConfig.$getDirPath(),
      }))
    )
    .filter(({ get }) => !isUrl(get))
    .map(
      ({ get, serviceDirPath }) =>
        [get, getUrlOrAbsolutePath(get, serviceDirPath)] as const
    );

  const moduleAbsolutePathOrURLToModuleConfigsMap = new Map<
    string,
    InitializedReadonlyConfig<ConfigV0>
  >(
    await Promise.all(
      [...downloadedModulesMap.entries(), ...localModuleAbsolutePaths].map(
        async ([originalGetValue, moduleAbsolutePath]): Promise<
          [string, InitializedReadonlyConfig<ConfigV0>]
        > => {
          const moduleConfig = await initReadonlyModuleConfig(
            moduleAbsolutePath
          );

          if (moduleConfig === null) {
            return commandObj.error(
              isUrl(originalGetValue)
                ? `Downloaded invalid module from ${color.yellow(
                    originalGetValue
                  )} to ${moduleAbsolutePath}`
                : `Invalid module found at ${moduleAbsolutePath}`
            );
          }

          return [
            isUrl(originalGetValue) ? originalGetValue : moduleAbsolutePath,
            moduleConfig,
          ];
        }
      )
    )
  );

  const marineCli = await initMarineCli(fluenceConfig);

  await buildModules(
    [...moduleAbsolutePathOrURLToModuleConfigsMap.values()],
    marineCli
  );

  const workers: Upload_deployArgConfig["workers"] = hostsOrDeals
    .filter(([workerName]) => workersToDeployConfirmed.includes(workerName))
    .map(([workerName, { peerIds = [] }]) => {
      if (hosts && peerIds.length === 0) {
        commandObj.error(
          `You must have at least one peerId listed in ${color.yellow(
            "peerIds"
          )} property in ${color.yellow(
            `hosts.${workerName}`
          )} property in ${FLUENCE_CONFIG_FILE_NAME}`
        );
      }

      const workerConfig = workersFromFluenceConfig[workerName];

      assert(
        workerConfig !== undefined,
        `Unreachable. workerNamesNotFoundInWorkersConfig was empty but error still happened. Looking for ${workerName} in ${JSON.stringify(
          workersFromFluenceConfig
        )}`
      );

      const services: Upload_deployArgConfig["workers"][number]["config"]["services"] =
        (workerConfig.services ?? []).map((serviceName) => {
          const maybeServiceConfig = serviceConfigs.find(
            (c) => c.serviceName === serviceName
          );

          assert(
            maybeServiceConfig !== undefined,
            `Unreachable. Service should not be undefined because serviceConfigs where created from workerConfig.services. Looking for ${serviceName} in ${JSON.stringify(
              serviceConfigs
            )}`
          );

          const { overrideModules, serviceConfig } = maybeServiceConfig;

          const { [FACADE_MODULE_NAME]: facadeModule, ...restModules } =
            serviceConfig.modules;

          const modules = [
            ...Object.entries(restModules),
            [FACADE_MODULE_NAME, facadeModule] as const,
          ].map(([name, { get, ...overridesFromService }]) => {
            const moduleUrlOrAbsolutePath = getUrlOrAbsolutePath(
              get,
              serviceConfig.$getDirPath()
            );

            const moduleConfig = moduleAbsolutePathOrURLToModuleConfigsMap.get(
              moduleUrlOrAbsolutePath
            );

            assert(
              moduleConfig !== undefined,
              `Unreachable. Module should not be undefined because moduleConfigsMap was created from serviceConfigs.modules. Searching for ${moduleUrlOrAbsolutePath} in ${JSON.stringify(
                Object.fromEntries(
                  moduleAbsolutePathOrURLToModuleConfigsMap.entries()
                )
              )}`
            );

            const overridesFromProject = overrideModules?.[name];

            const overriddenModuleConfig = {
              ...moduleConfig,
              ...overridesFromService,
              ...overridesFromProject,
            };

            return {
              wasm: getModuleWasmPath(overriddenModuleConfig),
              config: JSON.stringify(
                moduleToJSONModuleConfig(overriddenModuleConfig)
              ),
            };
          });

          return {
            name: serviceName,
            modules,
          };
        });

      const spells = (workerConfig.spells ?? []).map((spellName) => {
        const maybeSpellConfig = spellConfigs.find((c) => c.name === spellName);

        assert(
          maybeSpellConfig !== undefined,
          `Unreachable. Spell should not be undefined because spellConfigs where created from workerConfig.spells. Looking for ${spellName} in ${JSON.stringify(
            spellConfigs
          )}`
        );

        return maybeSpellConfig;
      });

      return {
        name: workerName,
        hosts: peerIds,
        config: {
          services,
          spells,
        },
      };
    });

  if (workers.length === 0) {
    commandObj.error(`You must select at least one worker to deploy`);
  }

  return {
    workers,
    installation_script: spellInstallAirScript,
    installation_trigger: {
      clock: { start_sec: 1676293670, end_sec: 0, period_sec: 600 },
      connections: { connect: false, disconnect: false },
      blockchain: { start_block: 0, end_block: 0 },
    },
  };
};

export const ensureAquaFileWithWorkerInfo = async (
  workersConfig: WorkersConfigReadonly
) => {
  await writeFile(
    await ensureFluenceAquaWorkersPath(),
    jsToAqua(
      { deals: workersConfig.deals, hosts: workersConfig.hosts },
      "getWorkersInfo"
    ),
    FS_OPTIONS
  );
};
