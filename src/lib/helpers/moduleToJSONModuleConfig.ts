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

import type { ModuleConfigReadonly } from "../configs/project/module.js";

/* eslint-disable camelcase */
export type JSONModuleConf = {
  name: string;
  max_heap_size?: string;
  logger_enabled?: boolean;
  logging_mask?: number;
  mapped_dirs?: Record<string, string>;
  preopened_files?: Array<string>;
  envs?: Record<string, string>;
  mounted_binaries?: Record<string, string>;
  path?: string;
};

export const moduleToJSONModuleConfig = (
  moduleConfig: ModuleConfigReadonly & { wasmPath?: string | undefined }
): JSONModuleConf => {
  const {
    name,
    loggerEnabled,
    loggingMask,
    volumes,
    envs,
    maxHeapSize,
    mountedBinaries,
    preopenedFiles,
    wasmPath,
  } = moduleConfig;

  const jsonModuleConfig: JSONModuleConf = {
    name,
  };

  if (typeof wasmPath === "string") {
    jsonModuleConfig.path = wasmPath;
  }

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
    jsonModuleConfig.mapped_dirs = volumes;
    jsonModuleConfig.preopened_files = [...new Set(Object.values(volumes))];
  }

  if (preopenedFiles !== undefined) {
    jsonModuleConfig.preopened_files = [
      ...new Set([...Object.values(volumes ?? {}), ...preopenedFiles]),
    ];
  }

  if (envs !== undefined) {
    jsonModuleConfig.envs = envs;
  }

  if (mountedBinaries !== undefined) {
    jsonModuleConfig.mounted_binaries = mountedBinaries;
  }

  return jsonModuleConfig;
};
/* eslint-enable camelcase */
