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
import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { color } from "@oclif/color";
import sum from "lodash-es/sum.js";
import xbytes from "xbytes";
import { yamlDiffPatch } from "yaml-diff-patch";

import { buildModules } from "./build.js";
import { commandObj, isInteractive } from "./commandObj.js";
import type { Upload_deployArgConfig } from "./compiled-aqua/installation-spell/cli.js";
import type { InitializedReadonlyConfig } from "./configs/initConfig.js";
import {
  type FluenceConfig,
  type FluenceConfigReadonly,
  assertIsArrayWithHostsOrDeals,
  type OverrideModules,
} from "./configs/project/fluence.js";
import {
  type ConfigV0,
  initReadonlyModuleConfig,
} from "./configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  type OverridableServiceProperties,
  type ServiceConfigReadonly,
} from "./configs/project/service.js";
import {
  initReadonlySpellConfig,
  resolveEndSec,
  resolveStartSec,
} from "./configs/project/spell.js";
import type {
  Deal,
  Host,
  WorkersConfigReadonly,
} from "./configs/project/workers.js";
import {
  FS_OPTIONS,
  HOSTS_FILE_NAME,
  DEALS_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
  PER_WORKER_MEMORY_LIMIT,
  PER_WORKER_MEMORY_LIMIT_STR,
  MIN_MEMORY_PER_MODULE,
  MIN_MEMORY_PER_MODULE_STR,
} from "./const.js";
import { getAquaImports } from "./helpers/aquaImports.js";
import {
  downloadModule,
  getModuleWasmPath,
  getUrlOrAbsolutePath,
  isUrl,
} from "./helpers/downloadFile.js";
import { updateAquaServiceInterfaceFile } from "./helpers/generateServiceInterface.js";
import {
  jsToAqua,
  makeOptional,
  type CustomTypes,
} from "./helpers/jsToAqua.js";
import { moduleToJSONModuleConfig } from "./helpers/moduleToJSONModuleConfig.js";
import { commaSepStrToArr, splitErrorsAndResults } from "./helpers/utils.js";
import { initMarineCli } from "./marineCli.js";
import { resolvePeerId } from "./multiaddres.js";
import {
  ensureFluenceAquaDealsPath,
  ensureFluenceAquaHostsPath,
  projectRootDir,
} from "./paths.js";
import { checkboxes } from "./prompt.js";
import { hasKey } from "./typeHelpers.js";

const handlePreviouslyDeployedWorkers = async (
  deployedHostsOrDeals:
    | WorkersConfigReadonly["deals"]
    | WorkersConfigReadonly["hosts"]
    | undefined,
  workersToDeploy: Array<string>,
) => {
  if (deployedHostsOrDeals === undefined) {
    return workersToDeploy;
  }

  const previouslyDeployedWorkersNames = Object.keys(deployedHostsOrDeals);

  const previouslyDeployedWorkersNamesToBeDeployed = workersToDeploy.filter(
    (workerName) => {
      return previouslyDeployedWorkersNames.includes(workerName);
    },
  );

  if (previouslyDeployedWorkersNamesToBeDeployed.length === 0) {
    return workersToDeploy;
  }

  const confirmedWorkersNamesToDeploy = isInteractive
    ? await checkboxes({
        message: `There are workers that were deployed previously. Please select the ones you want to redeploy.`,
        options: previouslyDeployedWorkersNamesToBeDeployed,
        oneChoiceMessage(workerName) {
          return `Do you want to redeploy worker ${color.yellow(workerName)}`;
        },
        onNoChoices(): Array<string> {
          return [];
        },
      })
    : previouslyDeployedWorkersNamesToBeDeployed;

  const workerNamesToRemove = previouslyDeployedWorkersNamesToBeDeployed.filter(
    (workerName) => {
      return !confirmedWorkersNamesToDeploy.includes(workerName);
    },
  );

  if (workerNamesToRemove.length === 0) {
    return workersToDeploy;
  }

  return workersToDeploy.filter((workerName) => {
    return !workerNamesToRemove.includes(workerName);
  });
};

type UploadDeploySpellConfig =
  Upload_deployArgConfig["workers"][number]["config"]["spells"][number];

type UploadDeployServiceConfig =
  Upload_deployArgConfig["workers"][number]["config"]["services"][number];

type PrepareForDeployArg = {
  fluenceConfig: FluenceConfig;
  flags: {
    import: Array<string> | undefined;
    "no-build": boolean;
    "marine-build-args": string | undefined;
  };
  fluenceEnv: FluenceEnv;
  /**
   * only used in build command so all the spells are compiled and
   * so no error happens if some worker doesn't have any services or spells
   */
  isBuildCheck?: boolean;
  workerNames?: string | undefined;
  initPeerId?: string;
  workersConfig?: WorkersConfigReadonly;
};

export async function prepareForDeploy({
  fluenceConfig,
  flags: {
    "marine-build-args": marineBuildArgs,
    import: aquaImportsFromFlags,
    "no-build": noBuild,
  },
  fluenceEnv,
  isBuildCheck = false,
  workerNames: workerNamesString,
  initPeerId,
  workersConfig: maybeWorkersConfig,
}: PrepareForDeployArg): Promise<Upload_deployArgConfig> {
  const isDealDeploy = initPeerId === undefined;
  const hostsOrDealsString = isDealDeploy ? "deals" : "hosts";

  const hostsOrDeals = Object.entries(
    fluenceConfig[hostsOrDealsString] ??
      commandObj.error(
        `You must have a ${color.yellow(
          hostsOrDealsString,
        )} property in ${color.yellow(
          fluenceConfig.$getPath(),
        )} that contains a record with at least one worker name as a key`,
      ),
  );

  assertIsArrayWithHostsOrDeals(hostsOrDeals);

  const maybeDeployedHostsOrDeals = (maybeWorkersConfig ?? {})[
    hostsOrDealsString
  ];

  const workerNamesSet = hostsOrDeals.map(([workerName]) => {
    return workerName;
  });

  const workersToDeploy =
    workerNamesString === undefined
      ? workerNamesSet
      : commaSepStrToArr(workerNamesString);

  if (workersToDeploy.length === 0) {
    return commandObj.error(
      `${color.yellow(
        hostsOrDealsString,
      )} property in ${fluenceConfig.$getPath()} must contain at least one worker name as a key`,
    );
  }

  const { services: servicesFromFluenceConfig = {} } = fluenceConfig;
  const dealsOrHosts = isDealDeploy ? "deals" : "hosts";
  const { [dealsOrHosts]: workersFromFluenceConfig = {} } = fluenceConfig;

  const workersToDeployConfirmed = await handlePreviouslyDeployedWorkers(
    maybeDeployedHostsOrDeals,
    workersToDeploy,
  );

  const workerConfigs = workersToDeployConfirmed.map((workerName) => {
    const workerConfig = workersFromFluenceConfig[workerName];

    assert(
      workerConfig !== undefined,
      `Unreachable. workerNamesNotFoundInWorkersConfig was empty but error still happened. Looking for ${workerName} in ${JSON.stringify(
        workersFromFluenceConfig,
      )}`,
    );

    if (
      !isBuildCheck &&
      (workerConfig.services ?? []).length === 0 &&
      (workerConfig.spells ?? []).length === 0
    ) {
      return commandObj.error(
        `All workers must have at least one service or spell. Worker ${color.yellow(
          workerName,
        )} listed in ${fluenceConfig.$getPath()} ${color.yellow(
          dealsOrHosts,
        )} property does not have any spells or services`,
      );
    }

    return {
      workerName,
      workerConfig,
    };
  });

  const spellsToCompile = isBuildCheck
    ? Object.keys(fluenceConfig.spells ?? {})
    : [
        ...new Set(
          workerConfigs.flatMap(({ workerConfig }) => {
            return workerConfig.spells ?? [];
          }),
        ),
      ];

  const spellConfigs = (
    await compileSpells(fluenceConfig, aquaImportsFromFlags, spellsToCompile)
  ).map(({ functions, name, spellConfig, spellAquaFilePath }) => {
    const { script } = functions[spellConfig.function] ?? {};

    if (script === undefined) {
      commandObj.error(
        `Failed to find spell function ${color.yellow(
          spellConfig.function,
        )} in aqua file at ${color.yellow(spellAquaFilePath)}`,
      );
    }

    return {
      name,
      config: {
        blockchain: { end_block: 0, start_block: 0 },
        connections: { connect: false, disconnect: false },
        clock:
          spellConfig.clock?.periodSec === undefined
            ? {
                start_sec: 0,
                end_sec: 0,
                period_sec: 0,
              }
            : {
                start_sec: resolveStartSec(spellConfig),
                end_sec: resolveEndSec(spellConfig),
                period_sec: spellConfig.clock.periodSec,
              },
      },
      script,
      init_args: spellConfig.initArgs ?? {},
    };
  });

  const serviceNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => {
        return workerConfig.services ?? [];
      }),
    ),
  ];

  const serviceConfigsWithOverrides = await Promise.all(
    serviceNames.map(async (serviceName) => {
      const service = servicesFromFluenceConfig[serviceName];

      assert(
        service !== undefined,
        `Unreachable. can't find service ${serviceName} from workers property in ${fluenceConfig.$getPath()} in services property. This has to be checked on config init. Looking for ${serviceName} in ${JSON.stringify(
          servicesFromFluenceConfig,
        )}`,
      );

      const { get, overrideModules, ...overridableProperties } = service;

      const serviceConfig = await initReadonlyServiceConfig(
        get,
        projectRootDir,
      );

      if (serviceConfig === null) {
        return commandObj.error(
          isUrl(get)
            ? `Downloaded invalid service ${color.yellow(
                serviceName,
              )} from ${color.yellow(get)}`
            : `Invalid service ${color.yellow(serviceName)} at ${color.yellow(
                get,
              )}`,
        );
      }

      return {
        serviceName,
        overrideModules,
        serviceConfig,
        ...overridableProperties,
      };
    }),
  );

  const modulesUrls = [
    ...new Set(
      serviceConfigsWithOverrides
        .flatMap(({ serviceConfig }) => {
          return Object.values(serviceConfig.modules).map(({ get }) => {
            return get;
          });
        })
        .filter((get) => {
          return isUrl(get);
        }),
    ),
  ];

  const downloadedModulesMap = new Map<string, string>(
    await Promise.all(
      modulesUrls.map(async (url): Promise<[string, string]> => {
        return [url, await downloadModule(url)];
      }),
    ),
  );

  const localModuleAbsolutePaths = serviceConfigsWithOverrides
    .flatMap(({ serviceConfig }) => {
      return Object.values(serviceConfig.modules).map(({ get }) => {
        return {
          get,
          serviceDirPath: serviceConfig.$getDirPath(),
        };
      });
    })
    .filter(({ get }) => {
      return !isUrl(get);
    })
    .map(({ get, serviceDirPath }) => {
      return [get, getUrlOrAbsolutePath(get, serviceDirPath)] as const;
    });

  const moduleAbsolutePathOrURLToModuleConfigsMap = new Map<
    string,
    InitializedReadonlyConfig<ConfigV0>
  >(
    await Promise.all(
      [...downloadedModulesMap.entries(), ...localModuleAbsolutePaths].map(
        async ([originalGetValue, moduleAbsolutePath]): Promise<
          [string, InitializedReadonlyConfig<ConfigV0>]
        > => {
          const moduleConfig =
            await initReadonlyModuleConfig(moduleAbsolutePath);

          if (moduleConfig === null) {
            return commandObj.error(
              isUrl(originalGetValue)
                ? `Downloaded invalid module from ${color.yellow(
                    originalGetValue,
                  )} to ${moduleAbsolutePath}`
                : `Invalid module found at ${moduleAbsolutePath}`,
            );
          }

          return [
            isUrl(originalGetValue) ? originalGetValue : moduleAbsolutePath,
            moduleConfig,
          ];
        },
      ),
    ),
  );

  if (!noBuild) {
    const marineCli = await initMarineCli(fluenceConfig);

    await buildModules(
      [...moduleAbsolutePathOrURLToModuleConfigsMap.values()],
      marineCli,
      marineBuildArgs,
      fluenceConfig,
    );

    const serviceNamePathToFacadeMap: Record<string, string> =
      Object.fromEntries(
        serviceConfigsWithOverrides.map(({ serviceName, serviceConfig }) => {
          const { get } = serviceConfig.modules[FACADE_MODULE_NAME];

          const urlOrAbsolutePath = getUrlOrAbsolutePath(
            get,
            serviceConfig.$getDirPath(),
          );

          const moduleConfig =
            moduleAbsolutePathOrURLToModuleConfigsMap.get(urlOrAbsolutePath);

          assert(
            moduleConfig !== undefined,
            `Unreachable. Module config for ${urlOrAbsolutePath} can't be undefined`,
          );

          return [serviceName, getModuleWasmPath(moduleConfig)];
        }),
      );

    await updateAquaServiceInterfaceFile(
      serviceNamePathToFacadeMap,
      fluenceConfig.services,
      marineCli,
    );
  }

  const workers: Upload_deployArgConfig["workers"] = await Promise.all(
    hostsOrDeals
      .filter(([workerName]) => {
        return workersToDeployConfirmed.includes(workerName);
      })
      .map(([workerName, hostsOrDeals]) => {
        return resolveWorker({
          workerName,
          hostsOrDeals,
          fluenceConfig,
          workersFromFluenceConfig,
          serviceConfigsWithOverrides,
          moduleAbsolutePathOrURLToModuleConfigsMap,
          spellConfigs,
          maybeWorkersConfig,
          initPeerId,
          fluenceEnv,
        });
      }),
  );

  if (workers.length === 0) {
    commandObj.error(`You must select at least one worker to deploy`);
  }

  await validateWasmExist(workers);

  const { deal_install_script } = await import(
    "./compiled-aqua/installation-spell/deal_spell.js"
  );

  return {
    workers,
    installation_script: deal_install_script,
    installation_trigger: {
      clock: { start_sec: 1676293670, end_sec: 0, period_sec: 600 },
      connections: { connect: false, disconnect: false },
      blockchain: { start_block: 0, end_block: 0 },
    },
  };
}

const validateWasmExist = async (
  workers: Upload_deployArgConfig["workers"],
) => {
  const errors = (
    await Promise.all(
      workers
        .flatMap((worker) => {
          return worker.config.services.map((service) => {
            return {
              ...service,
              worker: worker.name,
            };
          });
        })
        .flatMap((service) => {
          return service.modules.map((module) => {
            return {
              ...module,
              service: service.name,
              worker: service.worker,
            };
          });
        })
        .map(async ({ wasm, service, worker }) => {
          try {
            await access(wasm);
            return true;
          } catch (e) {
            return `wasm at ${color.yellow(wasm)} for service ${color.yellow(
              service,
            )} in worker ${color.yellow(
              worker,
            )} does not exist. Make sure you have built it`;
          }
        }),
    )
  ).filter((result): result is string => {
    return typeof result === "string";
  });

  if (errors.length > 0) {
    commandObj.error(errors.join("\n"));
  }
};

const emptyDeal: Deal = {
  dealId: "",
  chainNetwork: "testnet",
  chainNetworkId: 0,
  dealIdOriginal: "",
  definition: "",
  timestamp: "",
};

const emptySpellIds: Host["installation_spells"][number] = {
  host_id: "",
  spell_id: "",
  worker_id: "",
};

const emptyHosts: Host = {
  definition: "",
  installation_spells: [emptySpellIds],
  relayId: "",
  timestamp: "",
  dummyDealId: "",
};

export const ensureAquaFileWithWorkerInfo = async (
  workersConfig: WorkersConfigReadonly,
  fluenceConfig: FluenceConfigReadonly,
  fluenceEnv: FluenceEnv,
) => {
  const dealWorkers = Object.fromEntries(
    Object.entries({
      ...fluenceConfig.deals,
      ...(workersConfig.deals?.[fluenceEnv] ?? {}),
    }).map(([workerName, info]) => {
      const key = workerName;
      // if worker was deployed put deal info, otherwise put null
      const maybeDeal = "dealId" in info ? info : null;
      const value = makeOptional(maybeDeal, emptyDeal);
      return [key, value];
    }),
  );

  const directHostingWorkers = Object.fromEntries(
    Object.entries({
      ...fluenceConfig.hosts,
      ...(workersConfig.hosts?.[fluenceEnv] ?? {}),
    }).map(([workerName, info]) => {
      const key = workerName;
      // if worker was deployed put hosts info, otherwise put null
      const maybeHost = "relayId" in info ? info : null;
      const value = makeOptional(maybeHost, emptyHosts);
      return [key, value];
    }),
  );

  const customHostsTypes: CustomTypes = [
    { name: "Host", properties: Object.keys(emptyHosts) },
    { name: "SpellLocation", properties: Object.keys(emptySpellIds) },
  ];

  await writeFile(
    await ensureFluenceAquaHostsPath(),
    jsToAqua({
      valueToConvert: directHostingWorkers,
      fileName: HOSTS_FILE_NAME,
      customTypes: customHostsTypes,
    }),
    FS_OPTIONS,
  );

  const customDealsTypes: CustomTypes = [
    { name: "Deal", properties: Object.keys(emptyDeal) },
  ];

  await writeFile(
    await ensureFluenceAquaDealsPath(),
    jsToAqua({
      valueToConvert: dealWorkers,
      fileName: DEALS_FILE_NAME,
      customTypes: customDealsTypes,
    }),
    FS_OPTIONS,
  );
};

type ResolveWorkerArgs = {
  fluenceConfig: FluenceConfig;
  hostsOrDeals: NonNullable<
    FluenceConfig["deals"] | FluenceConfig["hosts"]
  >[string];
  workerName: string;
  workersFromFluenceConfig: NonNullable<
    FluenceConfig["deals"] | FluenceConfig["hosts"]
  >;
  serviceConfigsWithOverrides: ({
    serviceName: string;
    overrideModules: OverrideModules | undefined;
    serviceConfig: ServiceConfigReadonly;
  } & OverridableServiceProperties)[];
  moduleAbsolutePathOrURLToModuleConfigsMap: Map<
    string,
    InitializedReadonlyConfig<ConfigV0>
  >;
  spellConfigs: UploadDeploySpellConfig[];
  maybeWorkersConfig: WorkersConfigReadonly | undefined;
  initPeerId: string | undefined;
  fluenceEnv: FluenceEnv;
};

export async function compileSpells(
  fluenceConfig: FluenceConfig,
  aquaImportsFromFlags: string[] | undefined = [],
  spellNames?: string[],
) {
  const spellsFromFluenceConfig = (
    spellNames ?? Object.keys(fluenceConfig.spells ?? {})
  ).map((name) => {
    return {
      spellFromFluenceConfig: fluenceConfig.spells?.[name],
      name,
    };
  });

  const spellsNotFoundInFluenceConfig = spellsFromFluenceConfig.filter(
    ({ spellFromFluenceConfig }) => {
      return spellFromFluenceConfig === undefined;
    },
  );

  if (spellsNotFoundInFluenceConfig.length > 0) {
    commandObj.error(
      `Can't find the following spells in ${fluenceConfig.$getPath()} 'spells' property: ${color.yellow(
        spellsNotFoundInFluenceConfig
          .map(({ name }) => {
            return name;
          })
          .join(", "),
      )}`,
    );
  }

  const compiledSpells = await Promise.all(
    spellsFromFluenceConfig.map(async ({ spellFromFluenceConfig, name }) => {
      assert(
        spellFromFluenceConfig !== undefined,
        `Unreachable. Wasn't able to find spell. Spell existence in ${FLUENCE_CONFIG_FULL_FILE_NAME} must have been checked in the previous step`,
      );

      const { get, ...spellOverridesFromFluenceConfig } =
        spellFromFluenceConfig;

      const spellConfig = await initReadonlySpellConfig(get, projectRootDir);

      if (spellConfig === null) {
        return commandObj.error(
          isUrl(get)
            ? `Downloaded invalid spell ${color.yellow(name)}`
            : `Invalid spell ${color.yellow(name)} at ${color.yellow(get)}`,
        );
      }

      const overriddenSpellConfig = {
        ...spellConfig,
        ...spellOverridesFromFluenceConfig,
      };

      const spellAquaFilePath = resolve(
        spellConfig.$getDirPath(),
        spellConfig.aquaFilePath,
      );

      const { compileFromPath } = await import("@fluencelabs/aqua-api");

      const { errors, functions } = await compileFromPath({
        filePath: spellAquaFilePath,
        imports: await getAquaImports({
          aquaImportsFromFlags,
          maybeFluenceConfig: fluenceConfig,
        }),
      });

      return {
        errors,
        functions,
        spellAquaFilePath,
        spellConfig: overriddenSpellConfig,
        name,
      };
    }),
  );

  const compiledSpellsWithErrors = compiledSpells.filter(({ errors }) => {
    return errors.length > 0;
  });

  if (compiledSpellsWithErrors.length > 0) {
    commandObj.error(
      compiledSpellsWithErrors
        .map(({ errors, spellAquaFilePath }) => {
          return `Failed to compile aqua file with spell at ${color.yellow(
            spellAquaFilePath,
          )}:\n\n${errors.join("\n")}`;
        })
        .join("\n\n"),
    );
  }

  return compiledSpells;
}

async function resolveWorker({
  hostsOrDeals,
  workerName,
  fluenceConfig,
  workersFromFluenceConfig,
  serviceConfigsWithOverrides,
  moduleAbsolutePathOrURLToModuleConfigsMap,
  spellConfigs,
  maybeWorkersConfig,
  initPeerId,
  fluenceEnv,
}: ResolveWorkerArgs) {
  let dummyDealId = "deal_deploy_does_not_need_dummy_deal_id";
  const isDealDeploy = initPeerId === undefined;

  if (!isDealDeploy) {
    dummyDealId =
      maybeWorkersConfig?.hosts?.[fluenceEnv]?.[workerName]?.dummyDealId ??
      `${workerName}_${initPeerId}_${Math.random().toString().slice(2)}`;
  }

  const peerIdsOrNamedNodes =
    "peerIds" in hostsOrDeals ? hostsOrDeals.peerIds : [];

  const workerConfig = workersFromFluenceConfig[workerName];

  assert(
    workerConfig !== undefined,
    `Unreachable. workerNamesNotFoundInWorkersConfig was empty but error still happened. Looking for ${workerName} in ${JSON.stringify(
      workersFromFluenceConfig,
    )}`,
  );

  const servicesWithUnresolvedMemoryLimit = (workerConfig.services ?? []).map(
    (
      serviceName,
    ): Omit<UploadDeployServiceConfig, "total_memory_limit"> & {
      total_memory_limit: number | undefined;
    } => {
      const serviceConfigWithOverrides = serviceConfigsWithOverrides.find(
        (c) => {
          return c.serviceName === serviceName;
        },
      );

      assert(
        serviceConfigWithOverrides !== undefined,
        `Unreachable. Service should not be undefined because serviceConfigs where created from workerConfig.services. Looking for ${serviceName} in ${JSON.stringify(
          serviceConfigsWithOverrides,
        )}`,
      );

      const { overrideModules, serviceConfig, totalMemoryLimit } =
        serviceConfigWithOverrides;

      const { [FACADE_MODULE_NAME]: facadeModule, ...restModules } =
        serviceConfig.modules;

      const modules = [
        ...Object.entries(restModules),
        [FACADE_MODULE_NAME, facadeModule] as const,
      ].map(([name, { get, ...overridesFromService }]) => {
        const moduleUrlOrAbsolutePath = getUrlOrAbsolutePath(
          get,
          serviceConfig.$getDirPath(),
        );

        const moduleConfig = moduleAbsolutePathOrURLToModuleConfigsMap.get(
          moduleUrlOrAbsolutePath,
        );

        assert(
          moduleConfig !== undefined,
          `Unreachable. Module should not be undefined because moduleConfigsMap was created from serviceConfigs.modules. Searching for ${moduleUrlOrAbsolutePath} in ${JSON.stringify(
            Object.fromEntries(
              moduleAbsolutePathOrURLToModuleConfigsMap.entries(),
            ),
          )}`,
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
            moduleToJSONModuleConfig(overriddenModuleConfig),
          ),
        };
      });

      const totalMemoryLimitString =
        totalMemoryLimit ?? serviceConfig.totalMemoryLimit;

      return {
        name: serviceName,
        modules,
        total_memory_limit:
          totalMemoryLimitString === undefined
            ? undefined
            : xbytes.parseSize(totalMemoryLimitString),
      };
    },
  );

  const [
    servicesWithoutSpecifiedMemoryLimit,
    servicesWithSpecifiedMemoryLimit,
  ] = splitErrorsAndResults(servicesWithUnresolvedMemoryLimit, (service) => {
    return hasTotalMemoryLimit(service)
      ? { result: service }
      : { error: service };
  });

  const specifiedServicesMemoryLimit = sum(
    servicesWithSpecifiedMemoryLimit.map((service) => {
      return service.total_memory_limit;
    }),
  );

  if (specifiedServicesMemoryLimit > PER_WORKER_MEMORY_LIMIT) {
    throwMemoryExceedsError(
      workerName,
      specifiedServicesMemoryLimit,
      servicesWithSpecifiedMemoryLimit,
    );
  }

  const remainingMemoryPerService = Math.floor(
    (PER_WORKER_MEMORY_LIMIT - specifiedServicesMemoryLimit) /
      servicesWithoutSpecifiedMemoryLimit.length,
  );

  const servicesWithNotValidatedMemoryLimit = [
    ...servicesWithSpecifiedMemoryLimit,
    ...servicesWithoutSpecifiedMemoryLimit.map((service) => {
      service.total_memory_limit = remainingMemoryPerService;
      assert(hasTotalMemoryLimit(service), "Unreachable");
      return service;
    }),
  ];

  const [servicesWithNotEnoughMemory, services] = splitErrorsAndResults(
    servicesWithNotValidatedMemoryLimit,
    (service) => {
      const minMemoryForService =
        MIN_MEMORY_PER_MODULE * service.modules.length;

      if (service.total_memory_limit < minMemoryForService) {
        return {
          error: { service, minMemoryForService },
        };
      }

      return { result: service };
    },
  );

  if (servicesWithNotEnoughMemory.length > 0) {
    throwNotEnoughMemoryError(
      workerName,
      servicesWithNotEnoughMemory,
      services,
    );
  }

  if (services.length > 0) {
    commandObj.logToStderr(
      `Service memory limits for worker ${color.yellow(
        workerName,
      )}:\n${formatServiceMemoryLimits(services)}`,
    );
  }

  const spells = (workerConfig.spells ?? []).map((spellName) => {
    const spellConfig = spellConfigs.find((c) => {
      return c.name === spellName;
    });

    assert(
      spellConfig !== undefined,
      `Unreachable. Spell should not be undefined because spellConfigs where created from workerConfig.spells. Looking for ${spellName} in ${JSON.stringify(
        spellConfigs,
      )}`,
    );

    return spellConfig;
  });

  return {
    name: workerName,
    hosts: await Promise.all(
      peerIdsOrNamedNodes.map((peerIdOrNamedNode) => {
        return resolvePeerId(peerIdOrNamedNode, fluenceConfig);
      }),
    ),
    config: {
      services,
      spells,
    },
    dummy_deal_id: dummyDealId,
  };
}

function throwNotEnoughMemoryError(
  workerName: string,
  servicesWithNotEnoughMemory: {
    service: UploadDeployServiceConfig;
    minMemoryForService: number;
  }[],
  servicesWithSpecifiedMemoryLimit: UploadDeployServiceConfig[],
) {
  const formattedServiceMemoryLimits = servicesWithNotEnoughMemory.map(
    ({ service, minMemoryForService }) => {
      return `${service.name}: ${color.yellow(
        xbytes(service.total_memory_limit),
      )} < minimum memory limit for this service ${color.yellow(
        xbytes(minMemoryForService),
      )}`;
    },
  );

  const decreaseOtherServicesMessage =
    servicesWithSpecifiedMemoryLimit.length > 0
      ? ` or decrease the totalMemoryLimit for one or more of these service in the worker:\n${formatServiceMemoryLimits(
          servicesWithSpecifiedMemoryLimit,
        )}`
      : "";

  commandObj.error(
    `The following services of the worker ${color.yellow(
      workerName,
    )} don't have a big enough totalMemoryLimit:\n${formattedServiceMemoryLimits.join(
      "\n",
    )}\n\nEach service must have at least ${color.yellow(
      MIN_MEMORY_PER_MODULE_STR,
    )} for each module it has. Please make sure to specify a bigger totalMemoryLimit${decreaseOtherServicesMessage}`,
  );
}

function throwMemoryExceedsError(
  workerName: string,
  specifiedServicesMemoryLimit: number,
  servicesWithSpecifiedMemoryLimit: UploadDeployServiceConfig[],
) {
  const formattedServiceMemoryLimit = color.yellow(
    xbytes(specifiedServicesMemoryLimit),
  );

  commandObj.error(
    `Total memory limit for services in worker ${color.yellow(
      workerName,
    )} is ${formattedServiceMemoryLimit}, which exceeds per-worker memory limit: ${color.yellow(
      PER_WORKER_MEMORY_LIMIT_STR,
    )}. Decrease ${color.yellow(
      "totalMemoryLimit",
    )} in one or more of the following services:\n${formatServiceMemoryLimits(
      servicesWithSpecifiedMemoryLimit,
    )}`,
  );
}

function formatServiceMemoryLimits(
  servicesWithSpecifiedMemoryLimit: UploadDeployServiceConfig[],
) {
  return yamlDiffPatch(
    "",
    {},
    Object.fromEntries(
      servicesWithSpecifiedMemoryLimit.map((service) => {
        return [service.name, xbytes(service.total_memory_limit)];
      }),
    ),
  );
}

function hasTotalMemoryLimit(
  arg: Record<string, unknown>,
): arg is { total_memory_limit: number } {
  return (
    hasKey("total_memory_limit", arg) &&
    typeof arg["total_memory_limit"] === "number"
  );
}
