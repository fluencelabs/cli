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

/* eslint-disable camelcase */
declare module "node_modules-path" {
  export = node_modules;
  declare function node_modules(): string;
}

declare module "countly-sdk-nodejs" {
  export const device_id: string | undefined;
  function init(config: unknown): void;
  function begin_session(): void;
  function end_session(): void;
  function add_event(event: {
    key: string;
    segmentation?: Record<string, string>;
  }): void;
  function add_log(message: string): void;
  function log_error(error: string): void;
}
