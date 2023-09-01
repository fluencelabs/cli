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

import type Upload from "../../commands/workers/upload.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Upload_deployArgConfig } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { prepareForDeploy } from "../../lib/deployWorkers.js";
import { ensureAquaImports } from "../../lib/helpers/aquaImports.js";
import { jsonStringify } from "../../lib/helpers/jsonStringify.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";

export async function uploadImpl(
  this: Upload,
  command: typeof Upload,
): Promise<void> {
  const { flags, fluenceConfig, args } = await initCli(
    this,
    await this.parse(command),
    true,
  );

  await initFluenceClient(flags, fluenceConfig);
  await doRegisterIpfsClient(true);

  const aquaImports = await ensureAquaImports({
    maybeFluenceConfig: fluenceConfig,
    flags,
  });

  const uploadArg = await prepareForDeploy({
    workerNames: args["WORKER-NAMES"],
    fluenceConfig,
    hosts: true,
    aquaImports,
    noBuild: flags["no-build"],
    marineBuildArgs: flags["marine-build-args"],
  });

  const uploadResult = await upload(flags.tracing, uploadArg);
  commandObj.log(jsonStringify(uploadResult.workers));
  await disconnectFluenceClient();
}

async function upload(tracing: boolean, uploadArg: Upload_deployArgConfig) {
  if (tracing) {
    const { upload } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/upload.js"
    );

    return upload(uploadArg);
  }

  const { upload } = await import(
    "../../lib/compiled-aqua/installation-spell/upload.js"
  );

  return upload(uploadArg);
}
