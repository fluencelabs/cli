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

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ModuleConfigReadonly } from "../configs/project/module.js";
import type {
  ServiceConfigReadonly,
  OverridableServiceProperties,
} from "../configs/project/service.js";
import {
  COMPUTE_UNIT_MEMORY_STR,
  FS_OPTIONS,
  SERVICE_CONFIG_TOML_POSTFIX,
} from "../const.js";
import {
  ensureFluenceServiceConfigsDir,
  ensureFluenceTmpVolumesModuleDir,
  ensureFluenceTmpVolumesParticlesDir,
  ensureFluenceTmpVolumesServiceDir,
} from "../paths.js";

import { getModuleWasmPath } from "./downloadFile.js";

/**
 * Generates a service configuration TOML file.
 * @param serviceName - Name from fluence.yaml or if it's missing - name from the serviceConfig
 * @param serviceConfig - The service configuration.
 * @param serviceOverridesFromFluenceYaml - The service overrides from fluence.yaml.
 * @param allServiceModuleConfigs - An array of module configurations.
 * @returns The path of the created service configuration TOML file.
 */
export async function genServiceConfigToml(
  serviceName: string,
  serviceConfig: ServiceConfigReadonly,
  serviceOverridesFromFluenceYaml: OverridableServiceProperties | undefined,
  allServiceModuleConfigs: Array<ModuleConfigReadonly>,
) {
  const serviceConfigsDir = await ensureFluenceServiceConfigsDir();

  const serviceConfigTomlPath = join(
    serviceConfigsDir,
    `${serviceName}${SERVICE_CONFIG_TOML_POSTFIX}`,
  );

  const serviceConfigToml = await createServiceConfigToml(
    serviceName,
    serviceConfig,
    serviceOverridesFromFluenceYaml,
    allServiceModuleConfigs,
  );

  const stringifyToTOML = (await import("@iarna/toml/stringify.js")).default;

  await writeFile(
    serviceConfigTomlPath,
    stringifyToTOML(serviceConfigToml),
    FS_OPTIONS,
  );

  return serviceConfigTomlPath;
}

async function createServiceConfigToml(
  serviceName: string,
  serviceConfig: ServiceConfigReadonly,
  serviceOverridesFromFluenceYaml: OverridableServiceProperties | undefined,
  allServiceModuleConfigs: Array<ModuleConfigReadonly>,
) {
  const totalMemoryLimit =
    serviceOverridesFromFluenceYaml?.totalMemoryLimit ??
    serviceConfig.totalMemoryLimit;

  return {
    total_memory_limit:
      totalMemoryLimit === undefined
        ? // TODO: replace COMPUTE_UNIT_MEMORY_STR with calculated memory limit
          COMPUTE_UNIT_MEMORY_STR
        : totalMemoryLimit,
    module: await createModuleConfigsToml(serviceName, allServiceModuleConfigs),
  };
}

type TomlModuleConfig = {
  name: string;
  load_from?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  wasi?: {
    mapped_dirs?: Record<string, string>;
    envs?: Record<string, string>;
  };
  mounted_binaries?: Record<string, string>;
};

function createModuleConfigsToml(
  serviceName: string,
  moduleConfigs: Array<ModuleConfigReadonly>,
) {
  return Promise.all(
    moduleConfigs.map(async (moduleConfig) => {
      const {
        name,
        repl: { loggerEnabled, loggingMask } = {},
        effects: { binaries } = {},
      } = moduleConfig;

      const load_from = getModuleWasmPath(moduleConfig);

      const tomlModuleConfig: TomlModuleConfig = {
        name,
        load_from,
      };

      if (loggerEnabled !== undefined) {
        tomlModuleConfig.logger_enabled = loggerEnabled;
      }

      if (loggingMask !== undefined) {
        tomlModuleConfig.logging_mask = Number(loggingMask);
      }

      if (binaries !== undefined) {
        tomlModuleConfig.mounted_binaries = binaries;
      }

      tomlModuleConfig.wasi = {
        mapped_dirs: {
          "/tmp": await ensureFluenceTmpVolumesServiceDir(serviceName, "tmp"),
          "/storage": await ensureFluenceTmpVolumesServiceDir(
            serviceName,
            "storage",
          ),
          "/tmp/module": await ensureFluenceTmpVolumesModuleDir(
            serviceName,
            name,
            join("tmp", "module"),
          ),
          "/storage/module": await ensureFluenceTmpVolumesModuleDir(
            serviceName,
            name,
            join("storage", "module"),
          ),
          "/tmp/vault": await ensureFluenceTmpVolumesParticlesDir(),
        },
      };

      return tomlModuleConfig;
    }),
  );
}
