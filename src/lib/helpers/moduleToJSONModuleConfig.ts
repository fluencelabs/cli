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

import type { ModuleConfigReadonly } from "../configs/project/module.js";

/*
data ModuleWASIConfig:
    envs: ?Pairs
    mapped_dirs: ?Pairs
    mounted_binaries: ?Pairs

data ModuleConfig:
    name: string
    max_heap_size: ?string
    logger_enabled: ?bool
    logging_mask: ?i32
    wasi: ?ModuleWASIConfig
*/

type JSONModuleConfWASI = {
  mapped_dirs?: Record<string, string>;
  envs?: Record<string, string>;
};

type JSONModuleConf = {
  name: string;
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  mounted_binaries?: Record<string, string>;
  wasi: JSONModuleConfWASI;
};

export function moduleToJSONModuleConfig(
  moduleConfig: ModuleConfigReadonly & { wasmPath?: string | undefined },
): JSONModuleConf;
export function moduleToJSONModuleConfig(
  moduleConfig: ModuleConfigReadonly & { wasmPath?: string | undefined },
  isOld: true,
): JSONModuleConf;

export function moduleToJSONModuleConfig(
  moduleConfig: ModuleConfigReadonly & { wasmPath?: string | undefined },
): JSONModuleConf {
  const {
    name,
    loggerEnabled,
    loggingMask,
    volumes,
    envs,
    maxHeapSize,
    mountedBinaries,
  } = moduleConfig;

  const jsonModuleConfig: JSONModuleConf = {
    name,
    wasi: {},
  };

  if (loggerEnabled === true) {
    jsonModuleConfig.logger_enabled = true;
  }

  if (typeof loggingMask === "number") {
    jsonModuleConfig.logging_mask = loggingMask;
  }

  if (typeof maxHeapSize === "string") {
    jsonModuleConfig.max_heap_size = maxHeapSize;
  }

  if (volumes !== undefined) {
    jsonModuleConfig.wasi.mapped_dirs = volumes;
  }

  if (envs !== undefined) {
    jsonModuleConfig.wasi.envs = envs;
  }

  if (mountedBinaries !== undefined) {
    jsonModuleConfig.mounted_binaries = mountedBinaries;
  }

  return jsonModuleConfig;
}
/* eslint-enable camelcase */
