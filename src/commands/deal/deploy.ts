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

import { BaseCommand } from "../../baseCommand.js";
import { DEPLOYMENT_NAMES_ARG } from "../../lib/const.js";
import {
  DEPLOY_DESCRIPTION,
  DEPLOY_EXAMPLES,
  DEPLOY_FLAGS,
  deployImpl,
} from "../../lib/deploy.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override hidden = true;
  static override description = DEPLOY_DESCRIPTION;
  static override examples = DEPLOY_EXAMPLES;
  static override flags = DEPLOY_FLAGS;
  static override args = DEPLOYMENT_NAMES_ARG;
  async run(): Promise<void> {
    await deployImpl.bind(this)(Deploy);
  }
}
