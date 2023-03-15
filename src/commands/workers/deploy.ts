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

import assert from "node:assert";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { upload_deploy } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
} from "../../lib/const.js";
import {
  ensureAquaFileWithWorkerInfo,
  prepareForDeploy,
} from "../../lib/deployWorkers.js";
import { initFluenceClient } from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";
import { doRegisterLog } from "../../lib/localServices/log.js";

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = `Deploy workers to hosts, described in 'hosts' property in ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Names of workers to deploy (by default all workers from 'hosts' property in ${FLUENCE_CONFIG_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Deploy),
      true
    );

    const fluenceClient = await initFluenceClient(flags, fluenceConfig);
    doRegisterIpfsClient(fluenceClient, flags["off-aqua-logs"]);
    doRegisterLog(fluenceClient, flags["off-aqua-logs"]);

    const workersConfig = await initNewWorkersConfig();

    const uploadDeployArg = await prepareForDeploy({
      workerNames: args["WORKER-NAMES"],
      fluenceConfig,
      hosts: true,
      maybeWorkersConfig: workersConfig,
    });

    const errorMessages = uploadDeployArg.workers
      .map<string | null>(({ config: { services }, hosts, name }) => {
        if (services.length === 0) {
          return `Worker ${color.yellow(
            name
          )} has no services listed in 'workers' property of ${FLUENCE_CONFIG_FILE_NAME}`;
        }

        if (hosts.length === 0) {
          return `Worker ${color.yellow(
            name
          )} has no peerIds listed in 'hosts' property of ${FLUENCE_CONFIG_FILE_NAME}`;
        }

        return null;
      })
      .filter<string>(
        (errorMessage): errorMessage is string => errorMessage !== null
      );

    if (errorMessages.length > 0) {
      commandObj.error(errorMessages.join("\n"));
    }

    const uploadDeployResult = await upload_deploy(
      fluenceClient,
      uploadDeployArg
    );

    const timestamp = new Date().toISOString();

    const newDeployedWorkers = uploadDeployResult.workers.reduce<
      Exclude<typeof workersConfig.hosts, undefined>
    >(
      (acc, { name, ...worker }) => {
        const peerIds = uploadDeployArg.workers.find(
          (worker) => worker.name === name
        )?.hosts;

        assert(peerIds !== undefined);

        return {
          ...acc,
          [name]: { ...worker, timestamp, peerIds },
        };
      },
      { ...workersConfig.hosts }
    );

    workersConfig.hosts = newDeployedWorkers;
    await workersConfig.$commit();
    await ensureAquaFileWithWorkerInfo(workersConfig);
    commandObj.log("Successfully deployed");
  }
}
