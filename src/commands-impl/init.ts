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

import type Init from "../commands/init.js";
import { ensureTemplate, init } from "../lib/init.js";
import { initCli } from "../lib/lifeCycle.js";

export async function initImpl(
  this: Init,
  command: typeof Init,
): Promise<void> {
  const { flags, args } = await initCli(this, await this.parse(command));

  await init({
    maybeProjectPath: args.path,
    template: await ensureTemplate({
      templateOrUnknown: flags.template,
    }),
  });
}
