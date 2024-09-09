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

import assert from "node:assert";
import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { color } from "@oclif/color";
import cloneDeep from "lodash-es/cloneDeep.js";
import merge from "lodash-es/merge.js";
import sum from "lodash-es/sum.js";
import xbytes from "xbytes";
import { yamlDiffPatch } from "yaml-diff-patch";

import { DEFAULT_PUBLIC_FLUENCE_ENV } from "../common.js";

import { importAquaCompiler } from "./aqua.js";
import { buildModules } from "./buildModules.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { compileAquaFromFluenceConfigWithDefaults } from "./compileAquaAndWatch.js";
import type { Upload_deployArgConfig } from "./compiled-aqua/installation-spell/cli.js";
import {
  type FluenceConfig,
  type FluenceConfigReadonly,
  assertIsArrayWithHostsOrDeals,
  type OverrideModules,
} from "./configs/project/fluence.js";
import {
  initReadonlyModuleConfig,
  type OverridableModuleProperties,
  type ModuleConfigReadonly,
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
  MODULE_TYPE_RUST,
  FS_OPTIONS,
  HOSTS_FILE_NAME,
  DEALS_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
  COMPUTE_UNIT_MEMORY,
  MIN_MEMORY_PER_MODULE,
  MIN_MEMORY_PER_MODULE_STR,
  DEPLOYMENT_NAMES_ARG_NAME,
  MODULE_CONFIG_FULL_FILE_NAME,
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
import { genServiceConfigToml } from "./helpers/serviceConfigToml.js";
import { numToStr } from "./helpers/typesafeStringify.js";
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
        message: `There are workers that were deployed previously. Please select the ones you want to update.`,
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
   * only used in build command so all the spells are compiled, all services are built
   * and so no error happens if some worker doesn't have any services or spells
   */
  isBuildCheck?: boolean;
  deploymentNamesString?: string | undefined;
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
  deploymentNamesString,
  initPeerId,
  workersConfig: maybeWorkersConfig,
}: PrepareForDeployArg): Promise<Upload_deployArgConfig> {
  const isDealDeploy = initPeerId === undefined;
  const deploymentsOrHostsString = isDealDeploy ? "deployments" : "hosts";
  const dealsOrHostsString = isDealDeploy ? "deals" : "hosts";

  const hostsOrDeals = Object.entries(
    fluenceConfig[deploymentsOrHostsString] ?? {},
  );

  assertIsArrayWithHostsOrDeals(hostsOrDeals);

  const maybeDeployedHostsOrDeals = (maybeWorkersConfig ?? {})[
    dealsOrHostsString
  ];

  const deploymentsToDeploy = await getDeploymentNames(
    deploymentNamesString,
    fluenceConfig,
  );

  const { services: servicesFromFluenceConfig = {} } = fluenceConfig;

  const { [deploymentsOrHostsString]: deploymentsFromFluenceConfig = {} } =
    fluenceConfig;

  const deploymentsToDeployConfirmed = await handlePreviouslyDeployedWorkers(
    maybeDeployedHostsOrDeals,
    deploymentsToDeploy,
  );

  const deploymentConfigs = deploymentsToDeployConfirmed.map(
    (deploymentName) => {
      const deploymentConfig = deploymentsFromFluenceConfig[deploymentName];

      assert(
        deploymentConfig !== undefined,
        `Unreachable. deployment names are validated in getDeploymentNames. Looking for ${deploymentName} in ${JSON.stringify(
          deploymentsFromFluenceConfig,
        )}`,
      );

      if (
        !isBuildCheck &&
        (deploymentConfig.services ?? []).length === 0 &&
        (deploymentConfig.spells ?? []).length === 0
      ) {
        return commandObj.error(
          `All deployments must have at least one service or spell. Deployment ${color.yellow(
            deploymentName,
          )} listed in ${fluenceConfig.$getPath()} ${color.yellow(
            dealsOrHostsString,
          )} property does not have any spells or services`,
        );
      }

      return { deploymentName, deploymentConfig };
    },
  );

  const serviceNames = isBuildCheck
    ? Object.keys(fluenceConfig.services ?? {})
    : [
        ...new Set(
          deploymentConfigs.flatMap(({ deploymentConfig }) => {
            return deploymentConfig.services ?? [];
          }),
        ),
      ];

  const serviceConfigsWithOverrides = await Promise.all(
    serviceNames.map(async (serviceName) => {
      const service = servicesFromFluenceConfig[serviceName];

      assert(
        service !== undefined,
        `Unreachable. can't find service ${serviceName} from 'services' property in ${fluenceConfig.$getPath()}. This has to be checked on config init. Looking for ${serviceName} in ${JSON.stringify(
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
    ModuleConfigReadonly
  >(
    await Promise.all(
      [...downloadedModulesMap.entries(), ...localModuleAbsolutePaths].map(
        async ([originalGetValue, moduleAbsolutePath]): Promise<
          [string, ModuleConfigReadonly]
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
    const marineCli = await initMarineCli();

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

  const spellsToCompile = isBuildCheck
    ? Object.keys(fluenceConfig.spells ?? {})
    : [
        ...new Set(
          deploymentConfigs.flatMap(({ deploymentConfig }) => {
            return deploymentConfig.spells ?? [];
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

  const workers: Upload_deployArgConfig["workers"] = await Promise.all(
    hostsOrDeals
      .filter(([deploymentName]) => {
        return deploymentsToDeployConfirmed.includes(deploymentName);
      })
      .map(([deploymentName, hostsOrDeals]) => {
        return resolveDeployment({
          deploymentName,
          hostsOrDeals,
          fluenceConfig,
          deploymentsFromFluenceConfig,
          serviceConfigsWithOverrides,
          moduleAbsolutePathOrURLToModuleConfigsMap,
          spellConfigs,
          maybeWorkersConfig,
          initPeerId,
          fluenceEnv,
        });
      }),
  );

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
        .map(async ({ wasm, name, service, worker }) => {
          try {
            await access(wasm);
            return true;
          } catch (e) {
            return `wasm file not found at ${color.yellow(
              wasm,
            )}\nfor deployment: ${color.yellow(
              worker,
            )}\nservice: ${color.yellow(service)}\nmodule ${color.yellow(
              name,
            )}\nIf you expect CLI to compile the code of this module, please add ${color.yellow(
              `type: ${MODULE_TYPE_RUST}`,
            )} to the ${MODULE_CONFIG_FULL_FILE_NAME}`;
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

async function getDeploymentNames(
  deploymentNames: string | undefined,
  fluenceConfig: FluenceConfigReadonly,
): Promise<string[]> {
  if (deploymentNames !== undefined) {
    const names =
      deploymentNames === "" ? [] : commaSepStrToArr(deploymentNames);

    const [invalidNames, validDeploymentNames] = splitErrorsAndResults(
      names,
      (deploymentName) => {
        const deployment = fluenceConfig.deployments?.[deploymentName];

        if (deployment === undefined) {
          return { error: deploymentName };
        }

        return { result: deploymentName };
      },
    );

    if (invalidNames.length > 0) {
      commandObj.error(
        `Couldn't find deployments in ${fluenceConfig.$getPath()} deployments property: ${color.yellow(
          invalidNames.join(", "),
        )}`,
      );
    }

    return validDeploymentNames;
  }

  return checkboxes<string, never>({
    message: `Select one or more deployments from ${fluenceConfig.$getPath()}`,
    options: Object.keys(fluenceConfig.deployments ?? {}),
    validate: (choices: string[]) => {
      if (choices.length === 0) {
        return "Please select at least one deployment";
      }

      return true;
    },
    oneChoiceMessage(choice) {
      return `One deployment found at ${fluenceConfig.$getPath()}: ${color.yellow(
        choice,
      )}. Do you want to select it`;
    },
    onNoChoices() {
      commandObj.error(
        `You must have at least one deployment in 'deployments' property at ${fluenceConfig.$getPath()}`,
      );
    },
    argName: DEPLOYMENT_NAMES_ARG_NAME,
  });
}

const emptyDeal: Deal = {
  dealId: "",
  chainNetwork: DEFAULT_PUBLIC_FLUENCE_ENV,
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

export async function ensureAquaFileWithWorkerInfo(
  workersConfig: WorkersConfigReadonly,
  fluenceConfig: FluenceConfigReadonly,
  fluenceEnv: FluenceEnv,
) {
  const dealWorkers = Object.fromEntries(
    Object.entries({
      ...fluenceConfig.deployments,
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

  await compileAquaFromFluenceConfigWithDefaults(fluenceConfig);
}

type ResolveDeploymentArgs = {
  fluenceConfig: FluenceConfig;
  hostsOrDeals: NonNullable<
    FluenceConfig["deployments"] | FluenceConfig["hosts"]
  >[string];
  deploymentName: string;
  deploymentsFromFluenceConfig: NonNullable<
    FluenceConfig["deployments"] | FluenceConfig["hosts"]
  >;
  serviceConfigsWithOverrides: ({
    serviceName: string;
    overrideModules: OverrideModules | undefined;
    serviceConfig: ServiceConfigReadonly;
  } & OverridableServiceProperties)[];
  moduleAbsolutePathOrURLToModuleConfigsMap: Map<string, ModuleConfigReadonly>;
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

      const { compileFromPath } = await importAquaCompiler();

      // TODO: consider how to compile spells with aqua compilation args
      const { errors, functions } = await compileFromPath({
        filePath: spellAquaFilePath,
        imports: await getAquaImports({
          aquaImportsFromFlags,
          fluenceConfig,
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

async function resolveDeployment({
  hostsOrDeals,
  deploymentName,
  deploymentsFromFluenceConfig,
  serviceConfigsWithOverrides,
  moduleAbsolutePathOrURLToModuleConfigsMap,
  spellConfigs,
  maybeWorkersConfig,
  initPeerId,
  fluenceEnv,
}: ResolveDeploymentArgs) {
  let dummyDealId = "deal_deploy_does_not_need_dummy_deal_id";
  const isDealDeploy = initPeerId === undefined;

  if (!isDealDeploy) {
    dummyDealId =
      maybeWorkersConfig?.hosts?.[fluenceEnv]?.[deploymentName]?.dummyDealId ??
      `${deploymentName}_${initPeerId}_${numToStr(Math.random()).slice(2)}`;
  }

  const peerIdsOrNamedNodes =
    "peerIds" in hostsOrDeals ? hostsOrDeals.peerIds : [];

  const deploymentConfig = deploymentsFromFluenceConfig[deploymentName];

  assert(
    deploymentConfig !== undefined,
    `Unreachable. Wasn't able to find deployment. Looking for '${deploymentName}' in ${JSON.stringify(
      deploymentsFromFluenceConfig,
    )}`,
  );

  const servicesWithUnresolvedMemoryLimitPromises = (
    deploymentConfig.services ?? []
  ).map(
    async (
      serviceName,
    ): Promise<
      Omit<UploadDeployServiceConfig, "total_memory_limit"> & {
        total_memory_limit: number | undefined;
      }
    > => {
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

      const {
        overrideModules,
        serviceConfig,
        ...serviceOverridesFromFluenceYaml
      } = serviceConfigWithOverrides;

      const { totalMemoryLimit } = serviceOverridesFromFluenceYaml;

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

        const overridesFromFluenceYaml = overrideModules?.[name];

        const overriddenModuleConfig = overrideModule(
          moduleConfig,
          overridesFromService,
          overridesFromFluenceYaml,
        );

        return {
          wasm: getModuleWasmPath(overriddenModuleConfig),
          name: overriddenModuleConfig.name,
          overriddenModuleConfig,
        };
      });

      const totalMemoryLimitString =
        totalMemoryLimit ?? serviceConfig.totalMemoryLimit;

      await genServiceConfigToml(
        serviceName,
        serviceConfig,
        serviceOverridesFromFluenceYaml,
        modules.map(({ overriddenModuleConfig }) => {
          return overriddenModuleConfig;
        }),
      );

      return {
        name: serviceName,
        modules: modules.map(({ name, wasm }) => {
          return { name, wasm };
        }),
        total_memory_limit:
          totalMemoryLimitString === undefined
            ? undefined
            : xbytes.parseSize(totalMemoryLimitString),
      };
    },
  );

  const servicesWithUnresolvedMemoryLimit = await Promise.all(
    servicesWithUnresolvedMemoryLimitPromises,
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

  const workerMemory =
    ("computeUnits" in deploymentConfig ? deploymentConfig.computeUnits : 1) *
    COMPUTE_UNIT_MEMORY;

  if (specifiedServicesMemoryLimit > workerMemory) {
    throwMemoryExceedsError(
      deploymentName,
      specifiedServicesMemoryLimit,
      servicesWithSpecifiedMemoryLimit,
      workerMemory,
    );
  }

  const remainingMemoryPerService = Math.floor(
    (workerMemory - specifiedServicesMemoryLimit) /
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
      deploymentName,
      servicesWithNotEnoughMemory,
      services,
    );
  }

  if (services.length > 0) {
    commandObj.logToStderr(
      `Service memory limits for worker ${color.yellow(
        deploymentName,
      )}:\n${formatServiceMemoryLimits(services)}`,
    );
  }

  const spells = (deploymentConfig.spells ?? []).map((spellName) => {
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
    name: deploymentName,
    hosts: await Promise.all(
      peerIdsOrNamedNodes.map((peerIdOrNamedNode) => {
        return resolvePeerId(peerIdOrNamedNode);
      }),
    ),
    config: {
      services,
      spells,
    },
    dummy_deal_id: dummyDealId,
  };
}

export function overrideModule(
  moduleConfig: ModuleConfigReadonly,
  moduleConfigOverridesFromServiceYaml: OverridableModuleProperties | undefined,
  moduleConfigOverridesFromFluenceYaml: OverridableModuleProperties | undefined,
): ModuleConfigReadonly {
  return merge(
    cloneDeep(moduleConfig),
    moduleConfigOverridesFromServiceYaml ?? {},
    moduleConfigOverridesFromFluenceYaml ?? {},
  );
}

function throwNotEnoughMemoryError(
  deploymentName: string,
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
    `The following services of the deployment ${color.yellow(
      deploymentName,
    )} don't have a big enough totalMemoryLimit:\n${formattedServiceMemoryLimits.join(
      "\n",
    )}\n\nEach service must have at least ${color.yellow(
      MIN_MEMORY_PER_MODULE_STR,
    )} for each module it has. Please make sure to specify a bigger totalMemoryLimit${decreaseOtherServicesMessage}`,
  );
}

function throwMemoryExceedsError(
  deploymentName: string,
  specifiedServicesMemoryLimit: number,
  servicesWithSpecifiedMemoryLimit: UploadDeployServiceConfig[],
  workerMemory: number,
) {
  const formattedServiceMemoryLimit = color.yellow(
    xbytes(specifiedServicesMemoryLimit),
  );

  commandObj.error(
    `Total memory limit for services in deployment ${color.yellow(
      deploymentName,
    )} is ${formattedServiceMemoryLimit}, which exceeds per-worker memory limit: ${color.yellow(
      xbytes(workerMemory),
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
