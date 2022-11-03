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

import path from "node:path";

import color from "@oclif/color";
import { CliUx, Command } from "@oclif/core";

import {
  Distribution,
  DISTRIBUTION_EVEN,
  FluenceConfigReadonly,
  OverrideModules,
  ServiceDeployV1,
} from "../lib/configs/project/fluence";
import {
  initReadonlyModuleConfig,
  ModuleConfigReadonly,
  MODULE_TYPE_RUST,
} from "../lib/configs/project/module";
import { initProjectSecretsConfig } from "../lib/configs/project/projectSecrets";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
  ModuleV0,
  ServiceConfigReadonly,
} from "../lib/configs/project/service";
import {
  CommandObj,
  FLUENCE_CONFIG_FILE_NAME,
  MODULE_CONFIG_FILE_NAME,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
} from "../lib/const";
import {
  downloadModule,
  downloadService,
  getModuleUrlOrAbsolutePath,
  isUrl,
  validateAquaName,
} from "../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import {
  ConfigKeyPair,
  generateKeyPair,
  getExistingKeyPair,
  getProjectKeyPair,
  getUserKeyPair,
} from "../lib/keypairs";
import { initMarineCli, MarineCLI } from "../lib/marineCli";
import {
  getEvenlyDistributedIds,
  getEvenlyDistributedIdsFromTheList,
  getRandomRelayId,
  getRandomRelayIdFromTheList,
  Relays,
} from "../lib/multiaddr";
import { confirm } from "../lib/prompt";

export default class Build extends Command {
  static override description = `Build all application services, described in ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  async run(): Promise<void> {
    const { flags } = await this.parse(Build);
    const isInteractive = getIsInteractive(flags);
    const fluenceConfig = await ensureFluenceProject(this, isInteractive);

    const defaultKeyPair = await getExistingKeyPair({
      keyPairName: fluenceConfig.keyPairName,
      commandObj: this,
      isInteractive,
    });

    if (defaultKeyPair instanceof Error) {
      this.error(defaultKeyPair.message);
    }

    const marineCli = await initMarineCli(this, fluenceConfig);

    const allServiceInfos = await resolveServiceInfos({
      commandObj: this,
      fluenceConfig,
      defaultKeyPair,
      isInteractive,
    });

    await build({ allServiceInfos, marineCli, commandObj: this });
  }
}

type DeployInfoModule = {
  moduleName: string;
  moduleConfig: ModuleV0;
};

type ServiceInfo = {
  serviceName: string;
  serviceDirPath: string;
  deployId: string;
  peerId: string;
  modules: Array<DeployInfoModule>;
  keyPair: ConfigKeyPair;
};

const overrideModule = (
  mod: ModuleV0,
  overrideModules: OverrideModules | undefined,
  moduleName: string
): ModuleV0 => ({ ...mod, ...overrideModules?.[moduleName] });

type ResolveServiceInfos = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfigReadonly;
  defaultKeyPair: ConfigKeyPair;
  isInteractive: boolean;
};

export const resolveServiceInfos = async ({
  commandObj,
  fluenceConfig,
  defaultKeyPair,
  isInteractive,
}: ResolveServiceInfos): Promise<ServiceInfo[]> => {
  if (
    fluenceConfig.services === undefined ||
    Object.keys(fluenceConfig.services).length === 0
  ) {
    throw new Error(
      `Use ${color.yellow(
        "fluence service add"
      )} command to add services to ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}`
    );
  }

  type ServicePathPromises = Promise<{
    serviceName: string;
    serviceDirPath: string;
    get: string;
    deploy: Array<ServiceDeployV1>;
    keyPair: ConfigKeyPair;
  }>;

  CliUx.ux.action.start("Making sure all services are downloaded");

  const projectSecretsConfig = await initProjectSecretsConfig(commandObj);

  const getKeyPair = async (
    defaultKeyPair: ConfigKeyPair,
    keyPairName: string | undefined
  ): Promise<ConfigKeyPair> => {
    if (keyPairName === undefined) {
      return defaultKeyPair;
    }

    let keyPair =
      (await getProjectKeyPair({
        commandObj,
        keyPairName,
      })) ??
      (await getUserKeyPair({
        commandObj,
        keyPairName,
      }));

    if (keyPair === undefined) {
      CliUx.ux.action.stop("paused");

      commandObj.warn(`Key pair ${color.yellow(keyPairName)} not found`);

      const doGenerate = await confirm({
        message: `Do you want to generate new key-pair ${color.yellow(
          keyPairName
        )} for your project?`,
        isInteractive,
      });

      if (!doGenerate) {
        return commandObj.error("Aborted");
      }

      CliUx.ux.action.start("Making sure all services are downloaded");

      keyPair = await generateKeyPair(keyPairName);
      projectSecretsConfig.keyPairs.push(keyPair);
      await projectSecretsConfig.$commit();
    }

    return keyPair;
  };

  const servicePaths = await Promise.all(
    Object.entries(fluenceConfig.services).map(
      ([serviceName, { get, deploy, keyPairName }]): ServicePathPromises =>
        (async (): ServicePathPromises => ({
          serviceName,
          deploy,
          get,
          keyPair: await getKeyPair(defaultKeyPair, keyPairName),
          serviceDirPath: isUrl(get)
            ? await downloadService(get)
            : path.resolve(get),
        }))()
    )
  );

  CliUx.ux.action.stop();

  type ServiceConfigPromises = Promise<{
    serviceName: string;
    serviceConfig: ServiceConfigReadonly;
    serviceDirPath: string;
    deploy: Array<ServiceDeployV1>;
    keyPair: ConfigKeyPair;
  }>;

  const serviceConfigs = await Promise.all(
    servicePaths.map(
      ({
        serviceName,
        serviceDirPath,
        deploy,
        get,
        keyPair,
      }): ServiceConfigPromises =>
        (async (): ServiceConfigPromises => ({
          serviceName,
          deploy,
          keyPair,
          serviceConfig:
            (await initReadonlyServiceConfig(serviceDirPath, commandObj)) ??
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
          serviceDirPath,
        }))()
    )
  );

  return Promise.all(
    serviceConfigs.flatMap(
      ({
        serviceName,
        deploy,
        serviceConfig,
        serviceDirPath,
        keyPair,
      }): Array<Promise<ServiceInfo>> =>
        deploy.flatMap(
          ({
            deployId,
            count,
            peerId,
            peerIds,
            overrideModules,
            distribution,
            keyPairName,
          }): Array<Promise<ServiceInfo>> => {
            const deployIdValidity = validateAquaName(deployId);

            if (deployIdValidity !== true) {
              return commandObj.error(
                `deployId ${color.yellow(deployId)} ${deployIdValidity}`
              );
            }

            return getPeerIds({
              peerId: peerIds ?? peerId,
              distribution,
              count,
              relays: fluenceConfig.relays,
              namedPeerIds: fluenceConfig.peerIds,
            }).map(
              (peerId: string): Promise<ServiceInfo> =>
                (async (): Promise<ServiceInfo> => ({
                  serviceName,
                  serviceDirPath,
                  deployId,
                  peerId:
                    typeof peerId === "string"
                      ? fluenceConfig?.peerIds?.[peerId ?? ""] ?? peerId
                      : peerId,
                  modules: getDeployInfoModules({
                    commandObj,
                    deployId,
                    overrideModules,
                    serviceConfigModules: serviceConfig.modules,
                    serviceDirPath,
                    serviceName,
                  }),
                  keyPair: await getKeyPair(keyPair, keyPairName),
                }))()
            );
          }
        )
    )
  );
};

type BuildArg = {
  commandObj: CommandObj;
  allServiceInfos: ServiceInfo[];
  marineCli: MarineCLI;
};

export const build = async ({
  commandObj,
  allServiceInfos,
  marineCli,
}: BuildArg): Promise<Map<string, ModuleConfigReadonly>> => {
  const setOfAllGets = [
    ...new Set(
      allServiceInfos.flatMap(
        ({ modules, serviceDirPath }): Array<string> =>
          modules.map(({ moduleConfig: { get } }): string =>
            getModuleUrlOrAbsolutePath(get, serviceDirPath)
          )
      )
    ),
  ];

  CliUx.ux.action.start("Making sure all modules are downloaded and built");

  const mapOfAllModuleConfigs = new Map(
    await Promise.all(
      setOfAllGets.map(
        (get): Promise<[string, ModuleConfigReadonly]> =>
          (async (): Promise<[string, ModuleConfigReadonly]> => {
            const moduleConfig = isUrl(get)
              ? await initReadonlyModuleConfig(
                  await downloadModule(get),
                  commandObj
                )
              : await initReadonlyModuleConfig(get, commandObj);

            if (moduleConfig === null) {
              CliUx.ux.action.stop(color.red("error"));

              return commandObj.error(
                `Module with get: ${color.yellow(
                  get
                )} doesn't have ${color.yellow(MODULE_CONFIG_FILE_NAME)}`
              );
            }

            if (moduleConfig.type === MODULE_TYPE_RUST) {
              await marineCli({
                args: ["build"],
                flags: { release: true },
                cwd: path.dirname(moduleConfig.$getPath()),
              });
            }

            return [get, moduleConfig];
          })()
      )
    )
  );

  CliUx.ux.action.stop();

  return mapOfAllModuleConfigs;
};

type GetPeerIdsArg = {
  peerId: undefined | string | Array<string>;
  distribution: Distribution | undefined;
  count: number | undefined;
  relays: Relays;
  namedPeerIds: Record<string, string> | undefined;
};

const getPeerIds = ({
  peerId,
  distribution = DISTRIBUTION_EVEN,
  count,
  relays,
  namedPeerIds = {},
}: GetPeerIdsArg): Array<string> => {
  const getNamedPeerIds = (peerIds: Array<string>): string[] =>
    peerIds.map((peerId): string => namedPeerIds[peerId] ?? peerId);

  if (distribution === DISTRIBUTION_EVEN) {
    if (peerId === undefined) {
      return getEvenlyDistributedIds(relays, count);
    }

    return getEvenlyDistributedIdsFromTheList(
      getNamedPeerIds(typeof peerId === "string" ? [peerId] : peerId),
      count
    );
  }

  if (peerId === undefined) {
    return Array.from({ length: count ?? 1 }).map((): string =>
      getRandomRelayId(relays)
    );
  }

  const peerIds = typeof peerId === "string" ? [peerId] : peerId;
  return Array.from({ length: count ?? peerIds.length }).map((): string =>
    getRandomRelayIdFromTheList(peerIds)
  );
};

type GetDeployInfoModulesArg = {
  commandObj: CommandObj;
  overrideModules: OverrideModules | undefined;
  serviceName: string;
  deployId: string;
  serviceDirPath: string;
  serviceConfigModules: { facade: ModuleV0 } & Record<string, ModuleV0>;
};

const getDeployInfoModules = ({
  commandObj,
  overrideModules,
  serviceName,
  deployId,
  serviceDirPath,
  serviceConfigModules,
}: GetDeployInfoModulesArg): Array<DeployInfoModule> => {
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
      ([moduleName, mod]): DeployInfoModule => ({
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
