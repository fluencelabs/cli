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
import url from "node:url";

import oclif from "@oclif/core";
import { register } from "ts-node";

import { createErrorPromise } from "../src/countlyInterceptor.js";

// In dev mode -> use ts-node and dev plugins
process.env.NODE_ENV = "development";

register({
  project: path.join(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "..",
    "tsconfig.json"
  ),
  transpileOnly: true,
});

// In dev mode, always show stack traces
oclif.settings.debug = true;

// Start the CLI
oclif
  .run(process.argv.slice(2), import.meta.url)
  .then(oclif.flush)
  .catch((error) => createErrorPromise(error, oclif.Errors.handle));
