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
