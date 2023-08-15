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

import { compileFromPath } from "@fluencelabs/aqua-api";
import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { buildModules } from "./build.js";
import { commandObj, isInteractive } from "./commandObj.js";
import type { Upload_deployArgConfig } from "./compiled-aqua/installation-spell/cli.js";
import { deal_install_script } from "./compiled-aqua/installation-spell/deal_spell.js";
import type { InitializedReadonlyConfig } from "./configs/initConfig.js";
import {
  type FluenceConfig,
  type FluenceConfigReadonly,
  assertIsArrayWithHostsOrDeals,
} from "./configs/project/fluence.js";
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
import type {
  Deal,
  Host,
  WorkersConfigReadonly,
} from "./configs/project/workers.js";
import { FS_OPTIONS } from "./const.js";
import {
  downloadModule,
  getModuleWasmPath,
  getUrlOrAbsolutePath,
  isUrl,
} from "./helpers/downloadFile.js";
import { updateAquaServiceInterfaceFile } from "./helpers/generateServiceInterface.js";
import { jsToAqua, makeOptional } from "./helpers/jsToAqua.js";
import { moduleToJSONModuleConfig } from "./helpers/moduleToJSONModuleConfig.js";
import { initMarineCli } from "./marineCli.js";
import { resolvePeerId } from "./multiaddres.js";
import { ensureFluenceAquaWorkersPath, projectRootDir } from "./paths.js";
import { checkboxes } from "./prompt.js";

export const parseWorkers = (workerNamesString: string) => {
  return workerNamesString.split(",").map((s) => {
    return s.trim();
  });
};

const handlePreviouslyDeployedWorkers = async (
  maybeDeployedHostsOrDeals:
    | WorkersConfigReadonly["deals"]
    | WorkersConfigReadonly["hosts"]
    | undefined,
  workersToDeploy: Array<string>,
) => {
  if (maybeDeployedHostsOrDeals === undefined) {
    return workersToDeploy;
  }

  const previouslyDeployedWorkersNames = Object.keys(maybeDeployedHostsOrDeals);

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

type PrepareForDeployArg = {
  workerNames: string | undefined;
  fluenceConfig: FluenceConfig;
  aquaImports: Array<string>;
  noBuild: boolean;
  marineBuildArgs: undefined | string;
  maybeWorkersConfig?: WorkersConfigReadonly;
  hosts?: boolean;
};

export const prepareForDeploy = async ({
  workerNames: workerNamesString,
  fluenceConfig,
  aquaImports,
  noBuild,
  marineBuildArgs,
  maybeWorkersConfig,
  hosts = false,
}: PrepareForDeployArg): Promise<Upload_deployArgConfig> => {
  const hostsOrDealsString = hosts ? "hosts" : "deals";

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
      : parseWorkers(workerNamesString);

  if (workersToDeploy.length === 0) {
    return commandObj.error(
      `${color.yellow(
        hostsOrDealsString,
      )} property in ${fluenceConfig.$getPath()} must contain at least one worker name as a key`,
    );
  }

  const { services: servicesFromFluenceConfig = {} } = fluenceConfig;
  const { workers: workersFromFluenceConfig = {} } = fluenceConfig;

  const workersFromFluenceConfigArray = Object.keys(workersFromFluenceConfig);

  if (workersFromFluenceConfigArray.length === 0) {
    return commandObj.error(
      `You must have a ${color.yellow(
        "workers",
      )} property in ${fluenceConfig.$getPath()} that contains a record with at least one worker name as a key`,
    );
  }

  const workerNamesNotFoundInWorkersConfig = workersToDeploy.filter(
    (workerName) => {
      return !workersFromFluenceConfigArray.includes(workerName);
    },
  );

  if (workerNamesNotFoundInWorkersConfig.length !== 0) {
    commandObj.error(
      `Wasn't able to find workers ${workerNamesNotFoundInWorkersConfig
        .map((workerName) => {
          return color.yellow(workerName);
        })
        .join(", ")} in ${color.yellow(
        fluenceConfig.$getPath(),
      )} please check the spelling and try again`,
    );
  }

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
      (workerConfig.services ?? []).length === 0 &&
      (workerConfig.spells ?? []).length === 0
    ) {
      return commandObj.error(
        `All workers must have at least one service or spell. Worker ${color.yellow(
          workerName,
        )} listed in ${fluenceConfig.$getPath()} ${color.yellow(
          "workers",
        )} property does not have any spells or services`,
      );
    }

    return {
      workerName,
      workerConfig,
    };
  });

  const spellNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => {
        return workerConfig.spells ?? [];
      }),
    ),
  ];

  const spellConfigs = await Promise.all(
    spellNames.map(async (name) => {
      const maybeSpell = fluenceConfig.spells?.[name];

      assert(
        maybeSpell !== undefined,
        `Unreachable. can't find spell ${name} from workers property in ${fluenceConfig.$getPath()} in spells property. This has to be checked on config init. Looking for ${name} in ${JSON.stringify(
          fluenceConfig.spells,
        )}`,
      );

      const { get, ...spellOverridesFromFluenceConfig } = maybeSpell;

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

      const { errors, functions } = await compileFromPath({
        filePath: spellAquaFilePath,
        imports: aquaImports,
      });

      if (errors.length > 0) {
        commandObj.error(
          `Failed to compile aqua file with spell at ${color.yellow(
            spellAquaFilePath,
          )}:\n\n${errors.join("\n")}`,
        );
      }

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
    }),
  );

  const serviceNames = [
    ...new Set(
      workerConfigs.flatMap(({ workerConfig }) => {
        return workerConfig.services ?? [];
      }),
    ),
  ];

  const serviceConfigs = await Promise.all(
    serviceNames.map(async (serviceName) => {
      const maybeService = servicesFromFluenceConfig[serviceName];

      assert(
        maybeService !== undefined,
        `Unreachable. can't find service ${serviceName} from workers property in ${fluenceConfig.$getPath()} in services property. This has to be checked on config init. Looking for ${serviceName} in ${JSON.stringify(
          servicesFromFluenceConfig,
        )}`,
      );

      const { get, overrideModules } = maybeService;

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
      };
    }),
  );

  const modulesUrls = [
    ...new Set(
      serviceConfigs
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

  const localModuleAbsolutePaths = serviceConfigs
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
        serviceConfigs.map(({ serviceName, serviceConfig }) => {
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

  const workers: Upload_deployArgConfig["workers"] = hostsOrDeals
    .filter(([workerName]) => {
      return workersToDeployConfirmed.includes(workerName);
    })
    .map(([workerName, hostsOrDeals]) => {
      const peerIds = "peerIds" in hostsOrDeals ? hostsOrDeals.peerIds : [];

      if (hosts && peerIds.length === 0) {
        commandObj.error(
          `You must have at least one peerId listed in ${color.yellow(
            "peerIds",
          )} property in ${color.yellow(
            `hosts.${workerName}`,
          )} property in ${fluenceConfig.$getPath()}`,
        );
      }

      const workerConfig = workersFromFluenceConfig[workerName];

      assert(
        workerConfig !== undefined,
        `Unreachable. workerNamesNotFoundInWorkersConfig was empty but error still happened. Looking for ${workerName} in ${JSON.stringify(
          workersFromFluenceConfig,
        )}`,
      );

      const services: Upload_deployArgConfig["workers"][number]["config"]["services"] =
        (workerConfig.services ?? []).map((serviceName) => {
          const maybeServiceConfig = serviceConfigs.find((c) => {
            return c.serviceName === serviceName;
          });

          assert(
            maybeServiceConfig !== undefined,
            `Unreachable. Service should not be undefined because serviceConfigs where created from workerConfig.services. Looking for ${serviceName} in ${JSON.stringify(
              serviceConfigs,
            )}`,
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

          return {
            name: serviceName,
            modules,
          };
        });

      const spells = (workerConfig.spells ?? []).map((spellName) => {
        const maybeSpellConfig = spellConfigs.find((c) => {
          return c.name === spellName;
        });

        assert(
          maybeSpellConfig !== undefined,
          `Unreachable. Spell should not be undefined because spellConfigs where created from workerConfig.spells. Looking for ${spellName} in ${JSON.stringify(
            spellConfigs,
          )}`,
        );

        return maybeSpellConfig;
      });

      return {
        name: workerName,
        hosts: peerIds.map((peerId) => {
          return resolvePeerId(peerId);
        }),
        config: {
          services,
          spells,
        },
      };
    });

  if (workers.length === 0) {
    commandObj.error(`You must select at least one worker to deploy`);
  }

  await validateWasmExist(workers);

  return {
    workers,
    installation_script: deal_install_script,
    installation_trigger: {
      clock: { start_sec: 1676293670, end_sec: 0, period_sec: 600 },
      connections: { connect: false, disconnect: false },
      blockchain: { start_block: 0, end_block: 0 },
    },
  };
};

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

export const ensureAquaFileWithWorkerInfo = async (
  workersConfig: WorkersConfigReadonly,
  fluenceConfig: FluenceConfigReadonly,
) => {
  const dealWorkers = Object.fromEntries(
    Object.entries({ ...fluenceConfig.workers, ...workersConfig.deals }).map(
      ([workerName, info]) => {
        const key = workerName;
        // if worker was deployed put deal info, otherwise put null
        const maybeDeal = "dealId" in info ? info : null;

        const value = makeOptional(maybeDeal, {
          dealId: "",
          chainNetwork: "testnet",
          chainNetworkId: 0,
          dealIdOriginal: "",
          definition: "",
          timestamp: "",
        } satisfies Deal);

        return [key, value];
      },
    ),
  );

  const directHostingWorkers = Object.fromEntries(
    Object.entries({ ...fluenceConfig.workers, ...workersConfig.hosts }).map(
      ([workerName, info]) => {
        const key = workerName;
        // if worker was deployed put hosts info, otherwise put null
        const maybeHost = "relayId" in info ? info : null;

        const value = makeOptional(maybeHost, {
          definition: "",
          installation_spells: [
            {
              host_id: "",
              spell_id: "",
              worker_id: "",
            },
          ],
          relayId: "",
          timestamp: "",
        } satisfies Host);

        return [key, value];
      },
    ),
  );

  const hasSomeDealWorkers = Object.keys(dealWorkers).length !== 0;

  const hasSomeDirectHostingWorkers =
    Object.keys(directHostingWorkers).length !== 0;

  if (!hasSomeDealWorkers && !hasSomeDirectHostingWorkers) {
    return writeFile(await ensureFluenceAquaWorkersPath(), "", FS_OPTIONS);
  }

  const workersInfo: {
    deals?: typeof dealWorkers;
    hosts?: typeof directHostingWorkers;
  } = {};

  if (hasSomeDealWorkers) {
    workersInfo.deals = dealWorkers;
  }

  if (hasSomeDirectHostingWorkers) {
    workersInfo.hosts = directHostingWorkers;
  }

  await writeFile(
    await ensureFluenceAquaWorkersPath(),
    jsToAqua(workersInfo, "getWorkersInfo"),
    FS_OPTIONS,
  );
};
