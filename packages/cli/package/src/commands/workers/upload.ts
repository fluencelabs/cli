/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { jsonStringify } from "../../common.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Upload_deployArgConfig } from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
  IMPORT_FLAG,
  NO_BUILD_FLAG,
  TRACING_FLAG,
  MARINE_BUILD_ARGS_FLAG,
} from "../../lib/const.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { ensureFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Upload extends BaseCommand<typeof Upload> {
  static override hidden = true;
  static override description = `Upload workers to hosts, described in 'hosts' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...FLUENCE_CLIENT_FLAGS,
    ...OFF_AQUA_LOGS_FLAG,
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
    const { flags, args } = await initCli(this, await this.parse(Upload), true);
    await initFluenceClient(flags);
    await doRegisterIpfsClient();
    const { Fluence } = await import("@fluencelabs/js-client");
    const initPeerId = Fluence.getClient().getPeerId();

    const { prepareForDeploy } = await import("../../lib/deployWorkers.js");
    const fluenceEnv = await ensureFluenceEnv();

    const uploadArg = await prepareForDeploy({
      deploymentNamesString: args["WORKER-NAMES"],
      fluenceEnv,
      initPeerId,
      flags,
    });

    const uploadResult = await upload(flags.tracing, uploadArg);
    commandObj.log(jsonStringify(uploadResult.workers));
    await disconnectFluenceClient();
  }
}

async function upload(tracing: boolean, uploadArg: Upload_deployArgConfig) {
  if (tracing) {
    const { upload_workers } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/upload.js"
    );

    return upload_workers(uploadArg);
  }

  const { upload_workers } = await import(
    "../../lib/compiled-aqua/installation-spell/upload.js"
  );

  return upload_workers(uploadArg);
}
