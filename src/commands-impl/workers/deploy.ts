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

import { color } from "@oclif/color";

import type Deploy from "../../commands/workers/deploy.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Upload_deployArgConfig } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  ensureAquaFileWithWorkerInfo,
  prepareForDeploy,
} from "../../lib/deployWorkers.js";
import { ensureAquaImports } from "../../lib/helpers/aquaImports.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterIpfsClient } from "../../lib/localServices/ipfs.js";

export async function deployImpl(
  this: Deploy,
  command: typeof Deploy,
): Promise<void> {
  const { flags, fluenceConfig, args } = await initCli(
    this,
    await this.parse(command),
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
  await doRegisterIpfsClient(true);

  const uploadDeployResult = await uploadDeploy(flags.tracing, uploadDeployArg);

  const timestamp = new Date().toISOString();
  const { Fluence } = await import("@fluencelabs/js-client");
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
            [name]: worker.installation_spells.map(({ host_id, worker_id }) => {
              return {
                hostId: host_id,
                workerId: worker_id,
              };
            }),
          },
        };
      },
      { newDeployedWorkers: {}, infoToPrint: {} },
    );

  workersConfig.hosts = { ...workersConfig.hosts, ...newDeployedWorkers };
  await workersConfig.$commit();
  await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig);
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
