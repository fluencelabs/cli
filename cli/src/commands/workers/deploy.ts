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
