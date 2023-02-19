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

import { readFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

import { parse } from "yaml";

import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  FS_OPTIONS,
  MODULE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "./const.js";
import { isUrl } from "./helpers/downloadFile.js";
import type { JSONValue } from "./helpers/jsonPrint.js";
import { readFilesRecursively } from "./helpers/readFilesRecursively.js";
import { hasKey, isObject } from "./typeHelpers.js";

interface Service {
  name: string;
  path: string;
}

interface Options {
  paths?: boolean;
  modules?: boolean;
}

export const readFluenceProjectConfig = async (
  fluenceConfig: FluenceConfig | null,
  options: Options
): Promise<{
  [p: string]: JSONValue;
}> => {
  const { paths = false, modules = false } = options;
  const fluenceConfigPath = fluenceConfig?.$getPath() ?? "";
  const configFile = await readFile(fluenceConfigPath, FS_OPTIONS);
  const parsedConfig: { [p: string]: JSONValue } | unknown = parse(configFile);
  const mappedServices = getConfigServices(fluenceConfig);

  if (isObject(parsedConfig) && mappedServices.length === 0) {
    return parsedConfig;
  }

  const services = await readServices(
    mappedServices,
    dirname(fluenceConfigPath),
    { paths, modules }
  );

  return {
    ...(isObject(parsedConfig) ? parsedConfig : null),
    services,
  };
};

function getConfigServices(config: FluenceConfig | null): Service[] {
  if (!hasKey("services", config) || !isObject(config.services)) {
    return [];
  }

  return Object.entries(config.services).map((service) => {
    const [serviceName, serviceOptions] = service;
    const path = serviceOptions.get ?? "";

    return {
      name: serviceName,
      path: join(dirname(config.$getPath()), path, SERVICE_CONFIG_FILE_NAME),
    };
  });
}

async function readServiceModules(
  serviceConfig: { [p: string]: JSONValue } | null,
  servicePath: string,
  projectRootDir: string,
  paths: boolean
): Promise<{ [p: string]: JSONValue }> {
  const foundModules: string[] = [];
  const modules: { [p: string]: JSONValue } = {};

  if (
    !isObject(serviceConfig) ||
    !hasKey("name", serviceConfig) ||
    typeof serviceConfig.name !== "string"
  ) {
    return {};
  }

  for await (const p of readFilesRecursively(dirname(servicePath))) {
    const filename = basename(p);

    if (filename === MODULE_CONFIG_FILE_NAME) {
      foundModules.push(p);
    }
  }

  if (hasKey("modules", serviceConfig) && isObject(serviceConfig.modules)) {
    Object.entries(serviceConfig.modules).forEach(
      ([moduleName, moduleConfig]) => {
        if (
          hasKey("get", moduleConfig) &&
          typeof moduleConfig.get === "string"
        ) {
          const modulePath = moduleConfig.get ?? "";

          if (isUrl(modulePath)) {
            modules[moduleName] = {
              ...moduleConfig,
              ...(paths ? { path: null } : null),
            };
          } else {
            const foundModulePath = foundModules.find((p) => {
              return (
                typeof modulePath === "string" &&
                p.startsWith(join(dirname(servicePath), modulePath))
              );
            });

            if (typeof foundModulePath === "string") {
              modules[moduleName] = {
                ...moduleConfig,
                ...(paths
                  ? { path: relative(projectRootDir, foundModulePath) }
                  : null),
              };
            }
          }
        }
      }
    );
  }

  return modules;
}

async function readServices(
  services: Service[],
  projectRootDir: string,
  options: Options
): Promise<{ [p: string]: JSONValue }> {
  const { paths = false, modules = false } = options;
  const readServices: Record<string, string | unknown> = {};

  if (!Array.isArray(services) || services.length === 0) {
    return readServices;
  }

  for (let i = 0; i < services.length; i = i + 1) {
    const service = services[i];
    let serviceModules: { [p: string]: JSONValue } = {};

    if (hasKey("path", service) && isObject(service)) {
      const { path, name } = service;
      const serviceFile = await readFile(path, FS_OPTIONS);
      const parsedOptions: unknown = parse(serviceFile);
      const config = isObject(parsedOptions) ? parsedOptions : null;

      if (modules) {
        serviceModules = await readServiceModules(
          config,
          path,
          projectRootDir,
          paths
        );
      } else if (hasKey("modules", config)) {
        delete config.modules;
      }

      readServices[name] = {
        ...(paths ? { path } : null),
        ...config,
        ...(modules ? { modules: serviceModules } : null),
      };
    }
  }

  return readServices;
}
