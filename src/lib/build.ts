/**
 * Copyright 2022 Fluence Labs Limited
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
import { dirname, relative } from "node:path";

import { parse } from "@iarna/toml";
import stringifyToTOML from "@iarna/toml/stringify.js";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import type { ConfigKeyPair } from "../lib/configs/keyPair.js";
import type {
  FluenceConfigReadonly,
  OverrideModules,
  ServiceDeployV1,
} from "../lib/configs/project/fluence.js";
import {
  initReadonlyModuleConfig,
  ModuleConfigReadonly,
  MODULE_TYPE_RUST,
} from "../lib/configs/project/module.js";
import { initProjectSecretsConfig } from "../lib/configs/project/projectSecrets.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  ModuleV0,
  ServiceConfigReadonly,
} from "../lib/configs/project/service.js";
import {
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FS_OPTIONS,
  MODULE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../lib/const.js";
import {
  getUrlOrAbsolutePath,
  getModuleWasmPath,
  isUrl,
  getModuleDirAbsolutePath,
  validateAquaName,
  getServiceDirAbsolutePath,
} from "../lib/helpers/downloadFile.js";
import { generateServiceInterface } from "../lib/helpers/generateServiceInterface.js";
import type { MarineCLI } from "../lib/marineCli.js";
import { confirm } from "../lib/prompt.js";

import { ajv } from "./ajvInstance.js";
import { commandObj } from "./commandObj.js";
import { generateKeyPair } from "./helpers/generateKeyPair.js";
import { jsonStringify } from "./helpers/jsonStringify.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { getKeyPair } from "./keypairs.js";
import { getCargoTomlPath, projectRootDir } from "./paths.js";

type ModuleNameAndConfigDefinedInService = {
  moduleName: string;
  moduleConfig: ModuleV0;
};
type ServiceInfoWithUnresolvedModuleConfigs = Omit<
  ServiceDeployV1,
  "overrideModules" | "keyPairName"
> & {
  serviceName: string;
  serviceDirPath: string;
  moduleNamesAndConfigsDefinedInService: Array<ModuleNameAndConfigDefinedInService>;
  keyPair: ConfigKeyPair;
};

export type ServiceInfo = Omit<
  ServiceInfoWithUnresolvedModuleConfigs,
  "moduleNamesAndConfigsDefinedInService" | "serviceDirPath"
> & {
  moduleConfigs: Array<ModuleConfigReadonly & { wasmPath: string }>;
};

type ResolveServiceInfosArg = {
  fluenceConfig: FluenceConfigReadonly;
  defaultKeyPair: ConfigKeyPair;
};

const resolveServiceInfos = async ({
  fluenceConfig,
  defaultKeyPair,
}: ResolveServiceInfosArg): Promise<
  ServiceInfoWithUnresolvedModuleConfigs[]
> => {
  if (
    fluenceConfig.services === undefined ||
    Object.keys(fluenceConfig.services).length === 0
  ) {
    return commandObj.error(
      `Use ${color.yellow(
        "fluence service add"
      )} command to add services to ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}`
    );
  }

  type ServiceConfigPromises = Promise<{
    serviceName: string;
    serviceDirPath: string;
    serviceConfig: ServiceConfigReadonly;
    deploy: Array<ServiceDeployV1>;
    keyPair: ConfigKeyPair;
  }>;

  startSpinner("Making sure all services are downloaded");

  const projectSecretsConfig = await initProjectSecretsConfig();

  const ensureKeyPair = async (
    defaultKeyPair: ConfigKeyPair,
    keyPairName: string | undefined
  ): Promise<ConfigKeyPair> => {
    if (keyPairName === undefined) {
      return defaultKeyPair;
    }

    let keyPair = await getKeyPair(keyPairName);

    if (keyPair === undefined) {
      stopSpinner("paused");

      commandObj.warn(`Key pair ${color.yellow(keyPairName)} not found`);

      const doGenerate = await confirm({
        message: `Do you want to generate new key-pair ${color.yellow(
          keyPairName
        )} for your project?`,
      });

      if (!doGenerate) {
        return commandObj.error("Aborted");
      }

      startSpinner("Making sure all services are downloaded");

      keyPair = await generateKeyPair(keyPairName);
      projectSecretsConfig.keyPairs.push(keyPair);
      await projectSecretsConfig.$commit();
    }

    return keyPair;
  };

  const serviceConfigs = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      ([
        serviceName,
        { get, deploy = [{ deployId: DEFAULT_DEPLOY_NAME }], keyPairName },
      ]): ServiceConfigPromises =>
        (async (): ServiceConfigPromises => {
          const serviceDirPath = await getServiceDirAbsolutePath(
            get,
            projectRootDir
          );

          return {
            serviceName,
            deploy,
            keyPair: await ensureKeyPair(defaultKeyPair, keyPairName),
            serviceDirPath,
            serviceConfig:
              (await initReadonlyServiceConfig(serviceDirPath)) ??
              commandObj.error(
                `Service ${color.yellow(serviceName)} must have ${color.yellow(
                  SERVICE_CONFIG_FILE_NAME
                )}. ${
                  isUrl(get)
                    ? `Not able to find it after downloading and decompressing ${color.yellow(
                        get
                      )}`
                    : `Not able to find it at ${color.yellow(get)}`
                }`
              ),
          };
        })()
    )
  );

  stopSpinner();

  return Promise.all(
    serviceConfigs.flatMap(
      ({
        serviceName,
        deploy,
        serviceConfig,
        serviceDirPath,
        keyPair,
      }): Array<Promise<ServiceInfoWithUnresolvedModuleConfigs>> =>
        deploy.flatMap(
          async ({
            overrideModules,
            keyPairName,
            ...rest
          }): Promise<ServiceInfoWithUnresolvedModuleConfigs> => {
            const { deployId } = rest;
            const deployIdValidity = validateAquaName(deployId);

            if (deployIdValidity !== true) {
              return commandObj.error(
                `deployId ${color.yellow(deployId)} ${deployIdValidity}`
              );
            }

            return {
              serviceName,
              serviceDirPath,
              moduleNamesAndConfigsDefinedInService:
                getModuleNamesAndConfigsDefinedInServices({
                  deployId,
                  overrideModules,
                  serviceConfigModules: serviceConfig.modules,
                  serviceDirPath,
                  serviceName,
                }),
              keyPair: await ensureKeyPair(keyPair, keyPairName),
              ...rest,
            };
          }
        )
    )
  );
};

export type BuildArg = ResolveServiceInfosArg & {
  marineCli: MarineCLI;
};

export const build = async ({
  marineCli,
  ...resolveDeployInfosArg
}: BuildArg): Promise<Array<ServiceInfo>> => {
  const serviceInfos = await resolveServiceInfos(resolveDeployInfosArg);

  const setOfAllModuleUrlsOrAbsolutePaths = new Set(
    serviceInfos.flatMap(
      ({
        moduleNamesAndConfigsDefinedInService: modules,
        serviceDirPath,
      }): Array<string> =>
        modules.map(({ moduleConfig: { get } }): string =>
          getUrlOrAbsolutePath(get, serviceDirPath)
        )
    )
  );

  startSpinner("Making sure all modules are downloaded and built");

  const mapOfModuleConfigs = new Map(
    await Promise.all(
      [...setOfAllModuleUrlsOrAbsolutePaths].map(
        (moduleAbsolutePathOrUrl): Promise<[string, ModuleConfigReadonly]> =>
          (async (): Promise<[string, ModuleConfigReadonly]> => {
            const moduleAbsolutePath = await getModuleDirAbsolutePath(
              moduleAbsolutePathOrUrl
            );

            const maybeModuleConfig = await initReadonlyModuleConfig(
              moduleAbsolutePath
            );

            if (maybeModuleConfig === null) {
              stopSpinner(color.red("error"));
              return commandObj.error(
                `Module at: ${color.yellow(
                  moduleAbsolutePathOrUrl
                )} doesn't have ${color.yellow(MODULE_CONFIG_FILE_NAME)}`
              );
            }

            return [moduleAbsolutePathOrUrl, maybeModuleConfig];
          })()
      )
    )
  );

  await buildModules([...mapOfModuleConfigs.values()], marineCli);
  stopSpinner();

  const serviceNamePathToFacadeMap: Record<string, string> = {};

  const serviceInfoWithModuleConfigs = serviceInfos.map(
    ({
      moduleNamesAndConfigsDefinedInService: modules,
      serviceDirPath,
      ...rest
    }): ServiceInfo => {
      const moduleConfigs = modules.map(
        ({
          moduleConfig: { get, ...overrides },
        }): ModuleConfigReadonly & { wasmPath: string } => {
          const moduleConfig = mapOfModuleConfigs.get(
            getUrlOrAbsolutePath(get, serviceDirPath)
          );

          if (moduleConfig === undefined) {
            throw new Error(
              `Unreachable. Wasn't able to find module config for ${get}`
            );
          }

          const overriddenModuleConfig = { ...moduleConfig, ...overrides };

          return {
            ...overriddenModuleConfig,
            wasmPath: getModuleWasmPath(overriddenModuleConfig),
          };
        }
      );

      const facadeModuleConfig = moduleConfigs.at(-1);

      assert(
        facadeModuleConfig !== undefined,
        "Unreachable. Each service must have at least one module"
      );

      serviceNamePathToFacadeMap[rest.serviceName] =
        facadeModuleConfig.wasmPath;

      return {
        moduleConfigs,
        ...rest,
      };
    }
  );

  // generate interfaces for all services
  await Promise.all(
    Object.entries(serviceNamePathToFacadeMap).map(
      ([serviceName, pathToFacadeWasm]): Promise<void> =>
        generateServiceInterface({
          pathToFacadeWasm,
          marineCli,
          serviceName,
        })
    )
  );

  return serviceInfoWithModuleConfigs;
};

type CargoWorkspaceToml = {
  workspace?: {
    members?: string[];
  };
};

const cargoWorkspaceTomlSchema: JSONSchemaType<CargoWorkspaceToml> = {
  type: "object",
  properties: {
    workspace: {
      type: "object",
      properties: {
        members: {
          type: "array",
          items: {
            type: "string",
          },
          nullable: true,
        },
      },
      required: [],
      nullable: true,
    },
  },
  required: [],
};

const validateCargoWorkspaceToml = ajv.compile(cargoWorkspaceTomlSchema);

const updateWorkspaceCargoToml = async (
  moduleAbsolutePaths: string[]
): Promise<void> => {
  const cargoTomlPath = getCargoTomlPath();
  let cargoTomlFileContent: string;

  try {
    cargoTomlFileContent = await readFile(cargoTomlPath, FS_OPTIONS);
  } catch {
    cargoTomlFileContent = `[workspace]
members = []
`;
  }

  const parsedConfig: unknown = parse(cargoTomlFileContent);

  if (!validateCargoWorkspaceToml(parsedConfig)) {
    return commandObj.error(
      `Cargo.toml at ${cargoTomlPath} is not valid. Please fix it manually. ${jsonStringify(
        validateCargoWorkspaceToml.errors
      )}`
    );
  }

  const newConfig = {
    ...parsedConfig,
    workspace: {
      ...(parsedConfig?.workspace ?? {}),
      members: [
        ...new Set([
          ...(parsedConfig?.workspace?.members ?? []),
          ...moduleAbsolutePaths.map((moduleAbsolutePath) =>
            relative(projectRootDir, moduleAbsolutePath)
          ),
        ]),
      ],
    },
  };

  await writeFile(cargoTomlPath, stringifyToTOML(newConfig), FS_OPTIONS);
};

const resolveSingleServiceModuleConfigs = (
  serviceConfig: ServiceConfigReadonly,
  overridesFromFluenceYAMLMap: OverrideModules | undefined
) => {
  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfig.modules;

  const modulesWithNames = [
    ...Object.entries(otherModules),
    [FACADE_MODULE_NAME, facadeModule] as const,
  ];

  return Promise.all(
    modulesWithNames.map(([name, { get, ...overridesFromServiceYAML }]) =>
      (async () => {
        const overridesFromFluenceYAML = overridesFromFluenceYAMLMap?.[name];

        const moduleAbsolutePath = await getModuleDirAbsolutePath(
          get,
          dirname(serviceConfig.$getPath())
        );

        const maybeModuleConfig = await initReadonlyModuleConfig(
          moduleAbsolutePath
        );

        if (maybeModuleConfig === null) {
          stopSpinner(color.red("error"));
          return commandObj.error(
            `Module at: ${color.yellow(
              moduleAbsolutePath
            )} doesn't have ${color.yellow(MODULE_CONFIG_FILE_NAME)}`
          );
        }

        return {
          ...maybeModuleConfig,
          ...overridesFromServiceYAML,
          ...overridesFromFluenceYAML,
        };
      })()
    )
  );
};

export const resolveSingleServiceModuleConfigsAndBuild = async (
  serviceConfig: ServiceConfigReadonly,
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null,
  marineCli: MarineCLI
) => {
  const maybeOverridesFromFluenceCOnfig =
    maybeFluenceConfig?.services?.[serviceConfig.name]?.overrideModules;

  const moduleConfigs = await resolveSingleServiceModuleConfigs(
    serviceConfig,
    maybeOverridesFromFluenceCOnfig
  );

  await buildModules(moduleConfigs, marineCli);

  const facadeModuleConfig = moduleConfigs.at(-1);

  assert(
    facadeModuleConfig !== undefined,
    "Unreachable. Each service must have at least one module, which is a facade"
  );

  return { moduleConfigs, facadeModuleConfig };
};

export const buildModules = async (
  modulesConfigs: ModuleConfigReadonly[],
  marineCli: MarineCLI
): Promise<void> => {
  const rustModuleConfigs = modulesConfigs.filter(
    ({ type }) => type === MODULE_TYPE_RUST
  );

  await updateWorkspaceCargoToml(
    rustModuleConfigs.map((moduleConfig) => dirname(moduleConfig.$getPath()))
  );

  await marineCli({
    args: ["build", ...rustModuleConfigs.flatMap(({ name }) => ["-p", name])],
    flags: { release: true },
    cwd: projectRootDir,
  });
};

const overrideModule = (
  mod: ModuleV0,
  overrideModules: OverrideModules | undefined,
  moduleName: string
): ModuleV0 => ({ ...mod, ...overrideModules?.[moduleName] });

type GetModuleNamesAndConfigsDefinedInServicesArg = {
  overrideModules: OverrideModules | undefined;
  serviceName: string;
  deployId: string;
  serviceDirPath: string;
  serviceConfigModules: { facade: ModuleV0 } & Record<string, ModuleV0>;
};

const getModuleNamesAndConfigsDefinedInServices = ({
  overrideModules,
  serviceName,
  deployId,
  serviceDirPath,
  serviceConfigModules,
}: GetModuleNamesAndConfigsDefinedInServicesArg): ModuleNameAndConfigDefinedInService[] => {
  const modulesNotFoundInServiceYaml = Object.keys(
    overrideModules ?? {}
  ).filter((moduleName): boolean => !(moduleName in serviceConfigModules));

  if (modulesNotFoundInServiceYaml.length > 0) {
    commandObj.error(
      `${color.yellow(FLUENCE_CONFIG_FILE_NAME)} has service ${color.yellow(
        serviceName
      )} with deployId ${color.yellow(
        deployId
      )} that has moduleOverrides for modules that don't exist in the service ${color.yellow(
        serviceDirPath
      )}. Please make sure ${color.yellow(
        modulesNotFoundInServiceYaml.join(", ")
      )} spelled correctly `
    );
  }

  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfigModules;

  return [
    ...Object.entries(otherModules).map(
      ([moduleName, mod]): ModuleNameAndConfigDefinedInService => ({
        moduleConfig: overrideModule(mod, overrideModules, moduleName),
        moduleName,
      })
    ),
    {
      moduleConfig: overrideModule(
        facadeModule,
        overrideModules,
        FACADE_MODULE_NAME
      ),
      moduleName: FACADE_MODULE_NAME,
    },
  ];
};
