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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { RemoveArgWorkers } from "../../lib/compiled-aqua/installation-spell/deploy.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_CLIENT_FLAGS,
  TRACING_FLAG,
  WORKERS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { parseWorkers } from "../../lib/deployWorkers.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove workers from hosts, described in 'hosts' property in ${WORKERS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...TRACING_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Comma separated names of workers to remove. Example: "worker1,worker2" (by default all workers from 'hosts' property in ${WORKERS_CONFIG_FULL_FILE_NAME} are removed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Remove),
      true,
    );

    const workersConfig = await initNewWorkersConfig();

    const { ensureAquaFileWithWorkerInfo } = await import(
      "../../lib/deployWorkers.js"
    );

    await initFluenceClient(flags, fluenceConfig);
    const { Fluence } = await import("@fluencelabs/js-client");
    const relayId = (await Fluence.getClient()).getRelayPeerId();

    if (workersConfig.hosts === undefined) {
      return commandObj.error(
        `There are no workers in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
      );
    }

    const workerNamesSet = Object.keys(workersConfig.hosts).map(
      (workerName) => {
        return workerName;
      },
    );

    const workersToRemove =
      args["WORKER-NAMES"] === undefined
        ? workerNamesSet
        : parseWorkers(args["WORKER-NAMES"]);

    const removeArg: RemoveArgWorkers = {
      workers: Object.entries(workersConfig.hosts)
        .filter(([workerName]) => {
          return workersToRemove.includes(workerName);
        })
        .map(([name, worker]): RemoveArgWorkers["workers"][number] => {
          return {
            definition: worker.definition,
            name,
            dummy_deal_id: worker.dummyDealId,
            installation_spells: worker.installation_spells,
          };
        }),
    };

    const removeResult = await remove(flags.tracing, removeArg);

    const newDeployedWorkers = Object.fromEntries(
      Object.entries(workersConfig.hosts)
        .map(([name, { installation_spells: prevInstSp, ...rest }]) => {
          const currentWorkerResult = removeResult.find((w) => {
            return w.name === name;
          });

          const installation_spells = prevInstSp.filter(({ worker_id }) => {
            return (currentWorkerResult?.worker_ids ?? []).includes(worker_id);
          });

          return [name, { installation_spells, ...rest }] as const;
        })
        .filter(([, { installation_spells }]) => {
          return installation_spells.length > 0;
        }),
    );

    workersConfig.hosts = newDeployedWorkers;

    if (Object.keys(workersConfig.hosts).length === 0) {
      delete workersConfig.hosts;
    }

    await workersConfig.$commit();
    await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig);
    const { yamlDiffPatch } = await import("yaml-diff-patch");

    commandObj.log(
      `\n\n${color.yellow("Success!")}\n\nrelay: ${relayId}\n\n${yamlDiffPatch(
        "",
        {},
        { removed: removeResult },
      )}`,
    );

    await disconnectFluenceClient();
  }
}

async function remove(tracing: boolean, removeArg: RemoveArgWorkers) {
  if (tracing) {
    const { remove } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/deploy.js"
    );

    return remove(removeArg);
  }

  const { remove } = await import(
    "../../lib/compiled-aqua/installation-spell/deploy.js"
  );

  return remove(removeArg);
}
