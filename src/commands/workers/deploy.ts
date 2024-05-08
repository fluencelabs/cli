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

import { color } from "@oclif/color";
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Upload_deployArgConfig } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
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

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override hidden = true;
  static override description = `Deploy workers to hosts, described in 'hosts' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...OFF_AQUA_LOGS_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...IMPORT_FLAG,
    ...NO_BUILD_FLAG,
    ...TRACING_FLAG,
    ...MARINE_BUILD_ARGS_FLAG,
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

    const { ensureAquaFileWithWorkerInfo, prepareForDeploy } = await import(
      "../../lib/deployWorkers.js"
    );

    await initFluenceClient(flags);
    await doRegisterIpfsClient(true);
    const { Fluence } = await import("@fluencelabs/js-client");
    const relayId = Fluence.getClient().getRelayPeerId();
    const initPeerId = Fluence.getClient().getPeerId();
    const fluenceEnv = await ensureFluenceEnv();

    const uploadDeployArg = await prepareForDeploy({
      deploymentNamesString: args["WORKER-NAMES"],
      fluenceConfig,
      workersConfig,
      fluenceEnv,
      initPeerId,
      flags,
    });

    const uploadDeployResult = await uploadDeploy(
      flags.tracing,
      uploadDeployArg,
    );

    const timestamp = new Date().toISOString();

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
        (acc, { name, dummy_deal_id: dummyDealId, ...worker }) => {
          return {
            newDeployedWorkers: {
              ...acc.newDeployedWorkers,
              [name]: { ...worker, timestamp, relayId, dummyDealId },
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

    workersConfig.hosts = {
      ...workersConfig.hosts,
      [fluenceEnv]: {
        ...(workersConfig.hosts?.[fluenceEnv] ?? {}),
        ...newDeployedWorkers,
      },
    };

    await workersConfig.$commit();

    await ensureAquaFileWithWorkerInfo(
      workersConfig,
      fluenceConfig,
      fluenceEnv,
    );

    const { yamlDiffPatch } = await import("yaml-diff-patch");

    commandObj.log(
      `\n\n${color.yellow("Success!")}\n\nrelay: ${relayId}\n\n${yamlDiffPatch(
        "",
        {},
        { "deployed workers": infoToPrint },
      )}`,
    );

    await disconnectFluenceClient();
  }
}

async function uploadDeploy(
  tracing: boolean,
  uploadArg: Upload_deployArgConfig,
) {
  if (tracing) {
    const { upload_deploy } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/cli.js"
    );

    return upload_deploy(uploadArg);
  }

  const { upload_deploy } = await import(
    "../../lib/compiled-aqua/installation-spell/cli.js"
  );

  return upload_deploy(uploadArg);
}
