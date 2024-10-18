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
import isEmpty from "lodash-es/isEmpty.js";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { RemoveArgWorkers } from "../../lib/compiled-aqua/installation-spell/deploy.js";
import { initNewWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  TRACING_FLAG,
  WORKERS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Remove extends BaseCommand<typeof Remove> {
  static override hidden = true;
  static override description = `Remove workers from hosts, described in 'hosts' property in ${WORKERS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...OFF_AQUA_LOGS_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...TRACING_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Comma separated names of workers to remove. Example: "worker1,worker2" (by default all workers from 'hosts' property in ${WORKERS_CONFIG_FULL_FILE_NAME} are removed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, args } = await initCli(this, await this.parse(Remove), true);
    const workersConfig = await initNewWorkersConfig();

    const { ensureAquaFileWithWorkerInfo } = await import(
      "../../lib/deployWorkers.js"
    );

    await initFluenceClient(flags);
    const { Fluence } = await import("@fluencelabs/js-client");
    const relayId = Fluence.getClient().getRelayPeerId();
    const fluenceEnv = await ensureFluenceEnv();

    const deployedWorkersForEnv =
      workersConfig.hosts?.[fluenceEnv] ??
      commandObj.error(
        `No deployed workers found at ${color.yellow(
          `hosts.${fluenceEnv}`,
        )} in ${color.yellow(workersConfig.$getPath())}`,
      );

    const workersToRemove =
      args["WORKER-NAMES"] === undefined
        ? Object.keys(deployedWorkersForEnv)
        : commaSepStrToArr(args["WORKER-NAMES"]);

    const deployedWorkersForEnvArr = Object.entries(deployedWorkersForEnv);

    const removeArg: RemoveArgWorkers = {
      workers: deployedWorkersForEnvArr
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

    const newHosts = Object.fromEntries(
      deployedWorkersForEnvArr
        .map(([name, { installation_spells: prevInstSp, ...rest }]) => {
          const currentWorkerResult = removeResult.find((r) => {
            return r.name === name;
          });

          const removedWorkerIds = currentWorkerResult?.worker_ids ?? [];

          const notRemovedWorkers = prevInstSp.filter(({ worker_id }) => {
            const workerRemovedSuccessfully =
              removedWorkerIds.includes(worker_id);

            return !workerRemovedSuccessfully;
          });

          return [
            name,
            { installation_spells: notRemovedWorkers, ...rest },
          ] as const;
        })
        .filter(([, { installation_spells }]) => {
          return installation_spells.length > 0;
        }),
    );

    workersConfig.hosts = newHosts;

    if (isEmpty(workersConfig.hosts)) {
      delete workersConfig.hosts;
    }

    await workersConfig.$commit();
    await ensureAquaFileWithWorkerInfo();
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
