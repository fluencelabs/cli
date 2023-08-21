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

import { Fluence } from "@fluencelabs/js-client";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args } from "@oclif/core";
import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { upload_deploy } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { upload_deploy as upload_deploy_with_tracing } from "../../lib/compiled-aqua-with-tracing/installation-spell/cli.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
  IMPORT_FLAG,
  NO_BUILD_FLAG,
  TRACING_FLAG,
  MARINE_BUILD_ARGS,
} from "../../lib/const.js";
import {
  ensureAquaFileWithWorkerInfo,
  prepareForDeploy,
} from "../../lib/deployWorkers.js";
import { ensureAquaImports } from "../../lib/helpers/aquaImports.js";
import { initFluenceClient } from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy workers to hosts, described in 'hosts' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...IMPORT_FLAG,
    ...NO_BUILD_FLAG,
    ...TRACING_FLAG,
    ...MARINE_BUILD_ARGS,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Comma separated names of workers to deploy. Example: "worker1,worker2" (by default all workers from 'hosts' property in ${FLUENCE_CONFIG_FULL_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Deploy),
      true,
    );

    const workersConfig = await initNewWorkersConfig();

    const aquaImports = await ensureAquaImports({
      maybeFluenceConfig: fluenceConfig,
      flags,
    });

    const uploadDeployArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      fluenceConfig,
      hosts: true,
      maybeWorkersConfig: workersConfig,
      aquaImports,
      noBuild: flags["no-build"],
      marineBuildArgs: flags["marine-build-args"],
    });

    await initFluenceClient(flags, fluenceConfig);
    doRegisterIpfsClient(true);

    const uploadDeployResult = flags.tracing
      ? await upload_deploy_with_tracing(uploadDeployArg)
      : await upload_deploy(uploadDeployArg);

    const timestamp = new Date().toISOString();
    const relayId = (await Fluence.getClient()).getRelayPeerId();

    const { newDeployedWorkers, infoToPrint } =
      uploadDeployResult.workers.reduce<{
        newDeployedWorkers: Exclude<typeof workersConfig.hosts, undefined>;
        infoToPrint: Record<
          string,
          Array<{
            workerId: string;
            hostId: string;
          }>
        >;
      }>(
        (acc, { name, ...worker }) => {
          return {
            newDeployedWorkers: {
              ...acc.newDeployedWorkers,
              [name]: { ...worker, timestamp, relayId },
            },
            infoToPrint: {
              ...acc.infoToPrint,
              [name]: worker.installation_spells.map(
                ({ host_id, worker_id }) => {
                  return {
                    hostId: host_id,
                    workerId: worker_id,
                  };
                },
              ),
            },
          };
        },
        { newDeployedWorkers: {}, infoToPrint: {} },
      );

    workersConfig.hosts = { ...workersConfig.hosts, ...newDeployedWorkers };
    await workersConfig.$commit();
    await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig);

    commandObj.log(
      `\n\n${color.yellow("Success!")}\n\nrelay: ${relayId}\n\n${yamlDiffPatch(
        "",
        {},
        { "deployed workers": infoToPrint },
      )}`,
    );
  }
}
