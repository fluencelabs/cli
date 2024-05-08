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
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Get_logsArgApp_workers } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initNewWorkersConfigReadonly } from "../../lib/configs/project/workers.js";
import {
  WORKERS_CONFIG_FULL_FILE_NAME,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  TTL_FLAG_NAME,
  DIAL_TIMEOUT_FLAG_NAME,
  TRACING_FLAG,
  type FluenceEnv,
} from "../../lib/const.js";
import { formatAquaLogs } from "../../lib/helpers/formatAquaLogs.js";
import { stringifyUnknown, commaSepStrToArr } from "../../lib/helpers/utils.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { ensureFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Logs extends BaseCommand<typeof Logs> {
  static override hidden = true;
  static override description = `Get logs from deployed workers for hosts listed in ${WORKERS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...FLUENCE_CLIENT_FLAGS,
    ...OFF_AQUA_LOGS_FLAG,
    "worker-id": Flags.string({
      description: "Worker id",
      helpValue: "<worker-id>",
    }),
    "host-id": Flags.string({
      description: "Host id",
      helpValue: "<host-id>",
    }),
    "spell-id": Flags.string({
      description: "Spell id",
      helpValue: "<spell-id>",
      default: "worker-spell",
    }),
    ...TRACING_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Worker names to get logs for (by default all worker names from 'hosts' property of ${WORKERS_CONFIG_FULL_FILE_NAME})`,
    }),
  };
  async run(): Promise<void> {
    const { flags, args } = await initCli(this, await this.parse(Logs));
    await initFluenceClient(flags);
    const fluenceEnv = await ensureFluenceEnv();

    const logsArg = await getLogsArg({
      maybeWorkerNamesString: args["WORKER-NAMES"],
      maybeWorkerId: flags["worker-id"],
      maybeHostId: flags["host-id"],
      spellId: flags["spell-id"],
      fluenceEnv,
    });

    let logs;

    try {
      logs = await getLogs(flags.tracing, logsArg);
    } catch (e) {
      commandObj.error(
        `Wasn't able to get logs. You can try increasing --${TTL_FLAG_NAME} and --${DIAL_TIMEOUT_FLAG_NAME}: ${stringifyUnknown(
          e,
        )}`,
      );
    }

    commandObj.logToStderr(
      logs
        .map((logs) => {
          return formatAquaLogs(logs);
        })
        .join("\n\n"),
    );

    await disconnectFluenceClient();
  }
}

type GetLogsArgArg = {
  maybeWorkerNamesString: string | undefined;
  maybeWorkerId: string | undefined;
  maybeHostId: string | undefined;
  spellId: string;
  fluenceEnv: FluenceEnv;
};

const getLogsArg = async ({
  maybeWorkerNamesString,
  maybeWorkerId,
  maybeHostId,
  spellId,
  fluenceEnv,
}: GetLogsArgArg): Promise<Get_logsArgApp_workers> => {
  if (maybeWorkerId !== undefined || maybeHostId !== undefined) {
    const workerId =
      maybeWorkerId ?? (await input({ message: "Enter worker id" }));

    const hostId = maybeHostId ?? (await input({ message: "Enter host id" }));

    return {
      workers: [
        {
          definition: "",
          installation_spells: [
            {
              worker_id: workerId,
              host_id: hostId,
              spell_id: spellId,
            },
          ],
          name: "",
          dummy_deal_id: "",
        },
      ],
    };
  }

  const workersConfig = await initNewWorkersConfigReadonly();

  const hosts =
    workersConfig.hosts?.[fluenceEnv] ??
    commandObj.error(
      `No deployed workers found at ${color.yellow(
        `hosts.${fluenceEnv}`,
      )} in ${color.yellow(workersConfig.$getPath())}`,
    );

  const workerNamesSet = Object.keys(hosts);

  const workersToGetLogsFor =
    maybeWorkerNamesString === undefined
      ? workerNamesSet
      : commaSepStrToArr(maybeWorkerNamesString);

  const workerNamesNotFoundInWorkersConfig = workersToGetLogsFor.filter(
    (workerName) => {
      return !workerNamesSet.includes(workerName);
    },
  );

  if (workerNamesNotFoundInWorkersConfig.length !== 0) {
    commandObj.error(
      `Wasn't able to find workers ${workerNamesNotFoundInWorkersConfig
        .map((workerName) => {
          return color.yellow(workerName);
        })
        .join(", ")} in ${color.yellow(
        workersConfig.$getPath(),
      )} please check the spelling and try again`,
    );
  }

  return {
    workers: Object.entries(hosts)
      .filter(([name]) => {
        return workersToGetLogsFor.includes(name);
      })
      .map(([name, { dummyDealId, ...config }]) => {
        return { name, dummy_deal_id: dummyDealId, ...config };
      }),
  };
};

async function getLogs(tracing: boolean, logsArg: Get_logsArgApp_workers) {
  if (tracing) {
    const { get_logs } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/cli.js"
    );

    return get_logs(logsArg);
  }

  const { get_logs } = await import(
    "../../lib/compiled-aqua/installation-spell/cli.js"
  );

  return get_logs(logsArg);
}
