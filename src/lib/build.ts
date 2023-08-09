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
import { access, readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import { parse } from "@iarna/toml";
import stringifyToTOML from "@iarna/toml/stringify.js";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import type {
  FluenceConfigReadonly,
  OverrideModules,
} from "../lib/configs/project/fluence.js";
import {
  initReadonlyModuleConfig,
  type ModuleConfigReadonly,
} from "../lib/configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  type ServiceModuleV0,
  type ServiceConfigReadonly,
} from "../lib/configs/project/service.js";
import {
  FS_OPTIONS,
  MODULE_CONFIG_FULL_FILE_NAME,
  MODULE_TYPE_RUST,
  SERVICE_CONFIG_FULL_FILE_NAME,
  CLI_NAME,
} from "../lib/const.js";
import {
  getUrlOrAbsolutePath,
  getModuleWasmPath,
  isUrl,
} from "../lib/helpers/downloadFile.js";
import type { MarineCLI } from "../lib/marineCli.js";

import { ajv } from "./ajvInstance.js";
import { commandObj } from "./commandObj.js";
import { updateAquaServiceInterfaceFile } from "./helpers/generateServiceInterface.js";
import { jsonStringify } from "./helpers/jsonStringify.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { getCargoTomlPath, projectRootDir } from "./paths.js";

type ModuleNameAndConfigDefinedInService = {
  moduleName: string;
  moduleConfig: ServiceModuleV0;
};
type ServiceInfoWithUnresolvedModuleConfigs = {
  serviceName: string;
  serviceDirPath: string;
  moduleNamesAndConfigsDefinedInService: Array<ModuleNameAndConfigDefinedInService>;
};

type ServiceInfo = Omit<
  ServiceInfoWithUnresolvedModuleConfigs,
  "moduleNamesAndConfigsDefinedInService" | "serviceDirPath"
> & {
  moduleConfigs: Array<ModuleConfigReadonly & { wasmPath: string }>;
};

type ResolveServiceInfosArg = {
  fluenceConfig: FluenceConfigReadonly;
};

const resolveServiceInfos = async ({
  fluenceConfig,
}: ResolveServiceInfosArg): Promise<
  ServiceInfoWithUnresolvedModuleConfigs[]
> => {
  if (
    fluenceConfig.services === undefined ||
    Object.keys(fluenceConfig.services).length === 0
  ) {
    commandObj.logToStderr(
      `No services to build. Use ${color.yellow(
        `${CLI_NAME} service add`,
      )} command to add services to ${color.yellow(fluenceConfig.$getPath())}`,
    );

    return [];
  }

  type ServiceConfigPromises = Promise<{
    serviceName: string;
    serviceConfig: ServiceConfigReadonly;
  }>;

  startSpinner("Making sure all services are downloaded");

  const serviceConfigs = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      async ([serviceName, { get }]): ServiceConfigPromises => {
        return {
          serviceName,
          serviceConfig:
            (await initReadonlyServiceConfig(get, projectRootDir)) ??
            commandObj.error(
              `Service ${color.yellow(serviceName)} must have ${color.yellow(
                SERVICE_CONFIG_FULL_FILE_NAME,
              )}. ${
                isUrl(get)
                  ? `Not able to find it after downloading and decompressing ${color.yellow(
                      get,
                    )}`
                  : `Not able to find it at ${color.yellow(get)}`
              }`,
            ),
        };
      },
    ),
  );

  stopSpinner();

  return Promise.all(
    serviceConfigs.map(({ serviceName, serviceConfig }) => {
      return {
        serviceName,
        serviceDirPath: serviceConfig.$getDirPath(),
        moduleNamesAndConfigsDefinedInService:
          getModuleNamesAndConfigsDefinedInServices(serviceConfig.modules),
      };
    }),
  );
};

type BuildArg = ResolveServiceInfosArg & {
  marineCli: MarineCLI;
  marineBuildArgs: string | undefined;
};

export const build = async ({
  marineCli,
  marineBuildArgs,
  ...resolveDeployInfosArg
}: BuildArg): Promise<Array<ServiceInfo>> => {
  const serviceInfos = await resolveServiceInfos(resolveDeployInfosArg);

  const setOfAllModuleUrlsOrAbsolutePaths = new Set(
    serviceInfos.flatMap(
      ({
        moduleNamesAndConfigsDefinedInService: modules,
        serviceDirPath,
      }): Array<string> => {
        return modules.map(({ moduleConfig: { get } }): string => {
          return getUrlOrAbsolutePath(get, serviceDirPath);
        });
      },
    ),
  );

  const mapOfModuleConfigs = new Map(
    await Promise.all(
      [...setOfAllModuleUrlsOrAbsolutePaths].map(
        async (
          moduleAbsolutePathOrUrl,
        ): Promise<[string, ModuleConfigReadonly]> => {
          const maybeModuleConfig = await initReadonlyModuleConfig(
            moduleAbsolutePathOrUrl,
          );

          if (maybeModuleConfig === null) {
            return commandObj.error(
              `Module at: ${color.yellow(
                moduleAbsolutePathOrUrl,
              )} doesn't have ${color.yellow(MODULE_CONFIG_FULL_FILE_NAME)}`,
            );
          }

          return [moduleAbsolutePathOrUrl, maybeModuleConfig];
        },
      ),
    ),
  );

  if (serviceInfos.length > 0) {
    startSpinner("Making sure all services are built");

    await buildModules(
      [...mapOfModuleConfigs.values()],
      marineCli,
      marineBuildArgs,
      resolveDeployInfosArg.fluenceConfig,
    );

    stopSpinner();
  }

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
            getUrlOrAbsolutePath(get, serviceDirPath),
          );

          if (moduleConfig === undefined) {
            throw new Error(
              `Unreachable. Wasn't able to find module config for ${get}`,
            );
          }

          const overriddenModuleConfig = { ...moduleConfig, ...overrides };

          return {
            ...overriddenModuleConfig,
            wasmPath: getModuleWasmPath(overriddenModuleConfig),
          };
        },
      );

      const facadeModuleConfig = moduleConfigs.at(-1);

      assert(
        facadeModuleConfig !== undefined,
        "Unreachable. Each service must have at least one module",
      );

      serviceNamePathToFacadeMap[rest.serviceName] =
        facadeModuleConfig.wasmPath;

      return {
        moduleConfigs,
        ...rest,
      };
    },
  );

  await updateAquaServiceInterfaceFile(
    serviceNamePathToFacadeMap,
    resolveDeployInfosArg.fluenceConfig.services,
    marineCli,
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
  moduleAbsolutePaths: string[],
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
        validateCargoWorkspaceToml.errors,
      )}`,
    );
  }

  const oldCargoWorkspaceMembers = parsedConfig?.workspace?.members ?? [];

  const cargoWorkspaceMembersExistance = await Promise.allSettled(
    oldCargoWorkspaceMembers.map((member) => {
      return access(member);
    }),
  );

  const existingCargoWorkspaceMembers = oldCargoWorkspaceMembers.filter(
    (_, i) => {
      return cargoWorkspaceMembersExistance[i]?.status === "fulfilled";
    },
  );

  const newConfig = {
    ...parsedConfig,
    workspace: {
      ...(parsedConfig?.workspace ?? {}),
      members: [
        ...new Set([
          ...existingCargoWorkspaceMembers,
          ...moduleAbsolutePaths.map((moduleAbsolutePath) => {
            return relative(projectRootDir, moduleAbsolutePath);
          }),
        ]),
      ],
    },
  };

  await writeFile(cargoTomlPath, stringifyToTOML(newConfig), FS_OPTIONS);
};

const resolveSingleServiceModuleConfigs = (
  serviceConfig: ServiceConfigReadonly,
  overridesFromFluenceYAMLMap: OverrideModules | undefined,
) => {
  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfig.modules;

  const modulesWithNames = [
    ...Object.entries(otherModules),
    [FACADE_MODULE_NAME, facadeModule] as const,
  ];

  return Promise.all(
    modulesWithNames.map(
      async ([name, { get, ...overridesFromServiceYAML }]) => {
        const overridesFromFluenceYAML = overridesFromFluenceYAMLMap?.[name];

        const maybeModuleConfig = await initReadonlyModuleConfig(
          get,
          serviceConfig.$getDirPath(),
        );

        if (maybeModuleConfig === null) {
          stopSpinner(color.red("error"));
          return commandObj.error(
            `Cant find module config at ${color.yellow(get)}`,
          );
        }

        return {
          ...maybeModuleConfig,
          ...overridesFromServiceYAML,
          ...overridesFromFluenceYAML,
        };
      },
    ),
  );
};

export const resolveSingleServiceModuleConfigsAndBuild = async (
  serviceConfig: ServiceConfigReadonly,
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null,
  marineCli: MarineCLI,
  marineBuildArgs: string | undefined,
) => {
  const maybeOverridesFromFluenceCOnfig =
    maybeFluenceConfig?.services?.[serviceConfig.name]?.overrideModules;

  const moduleConfigs = await resolveSingleServiceModuleConfigs(
    serviceConfig,
    maybeOverridesFromFluenceCOnfig,
  );

  await buildModules(
    moduleConfigs,
    marineCli,
    marineBuildArgs,
    maybeFluenceConfig,
  );

  const facadeModuleConfig = moduleConfigs.at(-1);

  assert(
    facadeModuleConfig !== undefined,
    "Unreachable. Each service must have at least one module, which is a facade",
  );

  return { moduleConfigs, facadeModuleConfig };
};

export const buildModules = async (
  modulesConfigs: ModuleConfigReadonly[],
  marineCli: MarineCLI,
  marineBuildArgs: string | undefined,
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null,
): Promise<void> => {
  const rustModuleConfigs = modulesConfigs.filter(({ type }) => {
    return type === MODULE_TYPE_RUST;
  });

  await updateWorkspaceCargoToml(
    rustModuleConfigs.map((moduleConfig) => {
      return moduleConfig.$getDirPath();
    }),
  );

  if (rustModuleConfigs.length === 0) {
    return;
  }

  const pFlagForEachModule = rustModuleConfigs.flatMap(({ name }) => {
    return ["-p", name];
  });

  const marineBuildArgsToUse =
    marineBuildArgs ?? maybeFluenceConfig?.marineBuildArgs;

  const marineBuildArgsArr =
    marineBuildArgsToUse === undefined
      ? ["--release"]
      : marineBuildArgsToUse.split(" ");

  await marineCli({
    args: ["build", ...pFlagForEachModule, ...marineBuildArgsArr],
    cwd: projectRootDir,
  });
};

type GetModuleNamesAndConfigsDefinedInServicesArg = {
  facade: ServiceModuleV0;
} & Record<string, ServiceModuleV0>;

const getModuleNamesAndConfigsDefinedInServices = (
  serviceConfigModules: GetModuleNamesAndConfigsDefinedInServicesArg,
): ModuleNameAndConfigDefinedInService[] => {
  const { [FACADE_MODULE_NAME]: facadeModule, ...otherModules } =
    serviceConfigModules;

  return [
    ...Object.entries(otherModules).map(
      ([moduleName, moduleConfig]): ModuleNameAndConfigDefinedInService => {
        return {
          moduleConfig,
          moduleName,
        };
      },
    ),
    {
      moduleConfig: facadeModule,
      moduleName: FACADE_MODULE_NAME,
    },
  ];
};
