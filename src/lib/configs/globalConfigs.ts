/**
 * Copyright 2024 Fluence DAO
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

import type { EnvConfig } from "./project/env.js";
import type { UserConfig } from "./user/config.js";

export let userConfig: UserConfig;

export function setUserConfig(newUserConfig: UserConfig) {
  userConfig = newUserConfig;
}

export let envConfig: EnvConfig | null = null;

export function setEnvConfig(newEnvConfig: EnvConfig) {
  envConfig = newEnvConfig;
}
