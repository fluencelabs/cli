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

import { FLUENCE_ENV } from "../../src/lib/setupEnvironment.js";

export const fluenceEnv = process.env[FLUENCE_ENV];

export const RUN_DEPLOYED_SERVICES_TIMEOUT = 1000 * 60 * 3;

export const MY_SERVICE_NAME = "myService";
export const NEW_SERVICE_NAME = "newService";
export const NEW_SERVICE_2_NAME = "newService2";
export const NEW_SPELL_NAME = "newSpell";
export const NEW_MODULE_NAME = "newModule";
export const WORKER_SPELL = "worker-spell";

export const NO_PROJECT_TEST_NAME = "shouldWorkWithoutProject";

export const MAIN_RS_CONTENT = `#![allow(non_snake_case)]
use marine_rs_sdk::marine;
use marine_rs_sdk::module_manifest;

module_manifest!();

pub fn main() {}

#[marine]
pub struct MyStruct {
    a: i32,
    b: i32,
}

#[marine]
pub fn greeting() -> MyStruct {
  MyStruct{
    a: 1,
    b: 2,
  }
}
`;

export const NEW_SERVICE_INTERFACE = `service NewService("${NEW_SERVICE_NAME}"):
  greeting(name: string) -> string`;

export const NEW_SERVICE_2_INTERFACE = `service NewService2("${NEW_SERVICE_2_NAME}"):
  greeting(name: string) -> string`;

export const SERVICE_INTERFACES =
  NEW_SERVICE_INTERFACE + "\n\n\n" + NEW_SERVICE_2_INTERFACE;

export const UPDATED_SERVICE_INTERFACES = `data MyStruct:
  a: i32
  b: i32

service NewService("${NEW_SERVICE_NAME}"):
  greeting() -> MyStruct


${NEW_SERVICE_2_INTERFACE}`;

export const composeInterfacesFileContents = (interfaces: string) => {
  return `aqua Services declares *\n\n\n${interfaces}\n`;
};
