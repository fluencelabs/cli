#!/usr/bin/env -S node --no-warnings --loader ts-node/esm/transpile-only

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

// eslint-disable-next-line node/shebang
import oclif from "@oclif/core";

import {
  setUpProcessWarningListener,
  createErrorPromise,
} from "../src/errorInterceptor.js";

setUpProcessWarningListener();

// In dev mode -> use ts-node and dev plugins
process.env.NODE_ENV = "development";
// In dev mode, always show stack traces
oclif.settings.debug = true;

// Start the CLI
oclif
  .run(process.argv.slice(2), import.meta.url)
  .then(oclif.flush)
  .catch(
    /** @param {unknown} error */
    (error) => {
      return createErrorPromise(error);
    },
  );
