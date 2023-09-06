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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Upload_deployArgConfig } from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
  IMPORT_FLAG,
  NO_BUILD_FLAG,
  TRACING_FLAG,
  MARINE_BUILD_ARGS_FLAG,
} from "../../lib/const.js";
import { ensureAquaImports } from "../../lib/helpers/aquaImports.js";
import { jsonStringify } from "../../lib/helpers/jsonStringify.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";

export default class Upload extends BaseCommand<typeof Upload> {
  static override description = `Upload workers to hosts, described in 'hosts' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...FLUENCE_CLIENT_FLAGS,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...IMPORT_FLAG,
    ...NO_BUILD_FLAG,
    ...TRACING_FLAG,
    ...MARINE_BUILD_ARGS_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Names of workers to deploy (by default all workers from 'hosts' property in ${FLUENCE_CONFIG_FULL_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Upload),
      true,
    );

    await initFluenceClient(flags, fluenceConfig);
    await doRegisterIpfsClient(true);
    const { Fluence } = await import("@fluencelabs/js-client");
    const initPeerId = (await Fluence.getClient()).getPeerId();

    const aquaImports = await ensureAquaImports({
      maybeFluenceConfig: fluenceConfig,
      flags,
    });

    const { prepareForDeploy } = await import("../../lib/deployWorkers.js");

    const uploadArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      fluenceConfig,
      hosts: true,
      aquaImports,
      noBuild: flags["no-build"],
      marineBuildArgs: flags["marine-build-args"],
      initPeerId,
    });

    const uploadResult = await upload(flags.tracing, uploadArg);
    commandObj.log(jsonStringify(uploadResult.workers));
    await disconnectFluenceClient();
  }
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
