#!/usr/bin/env -S node --no-warnings

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

import oclif from "@oclif/core";

import {
  createErrorPromise,
  setUpProcessWarningListener,
} from "../dist/errorInterceptor.js";

setUpProcessWarningListener();

oclif
  .run(process.argv.slice(2), import.meta.url)
  .then(oclif.flush)
  .catch(
    /** @param {unknown} error */ (error) => {
      return createErrorPromise(error);
    },
  );
