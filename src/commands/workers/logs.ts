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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  get_logs,
  type Get_logsArgApp_workers,
} from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initReadonlyWorkersConfig } from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  WORKERS_CONFIG_FILE_NAME,
  OFF_AQUA_LOGS_FLAG,
  DOT_FLUENCE_DIR_NAME,
  FLUENCE_CLIENT_FLAGS,
  TTL_FLAG_NAME,
  DIAL_TIMEOUT_FLAG_NAME,
} from "../../lib/const.js";
import { parseWorkers } from "../../lib/deployWorkers.js";
import { initFluenceClient } from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Get logs from deployed workers for hosts listed in ${WORKERS_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...FLUENCE_CLIENT_FLAGS,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
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
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Worker names to get logs for (by default all worker names from 'hosts' property of ${WORKERS_CONFIG_FILE_NAME})`,
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(Logs)
    );

    await initFluenceClient(flags, maybeFluenceConfig);

    const logsArg = await getLogsArg({
      maybeWorkerNamesString: args["WORKER-NAMES"],
      maybeWorkerId: flags["worker-id"],
      maybeHostId: flags["host-id"],
      spellId: flags["spell-id"],
    });

    let logs;

    try {
      logs = await get_logs(logsArg);
    } catch (e) {
      commandObj.error(
        `Wasn't able to get logs. You can try increasing --${TTL_FLAG_NAME} and --${DIAL_TIMEOUT_FLAG_NAME}: ${String(
          e
        )}`
      );
    }

    commandObj.log(
      logs
        .map(
          ({ host_id, logs, spell_id, worker_name }) =>
            `${color.yellow(
              worker_name
            )} (host_id: ${host_id}, spell_id: ${spell_id}):\n\n${logs.join(
              "\n"
            )}`
        )
        .join("\n\n")
    );
  }
}

type GetLogsArgArg = {
  maybeWorkerNamesString: string | undefined;
  maybeWorkerId: string | undefined;
  maybeHostId: string | undefined;
  spellId: string;
};

const getLogsArg = async ({
  maybeWorkerNamesString,
  maybeWorkerId,
  maybeHostId,
  spellId,
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
        },
      ],
    };
  }

  const maybeWorkersConfig = await initReadonlyWorkersConfig();

  if (maybeWorkersConfig === null) {
    return commandObj.error(
      `Wasn't able to find ${color.yellow(
        WORKERS_CONFIG_FILE_NAME
      )} in project's ${DOT_FLUENCE_DIR_NAME} directory. Make sure you have deployed workers before trying to get logs`
    );
  }

  const workersConfig = maybeWorkersConfig;

  const hosts =
    workersConfig.hosts ??
    commandObj.error(
      `No deployed workers found in ${color.yellow(
        "hosts"
      )} property in ${color.yellow(workersConfig.$getPath())} file`
    );

  const workerNamesSet = Object.keys(hosts);

  const workersToGetLogsFor =
    maybeWorkerNamesString === undefined
      ? workerNamesSet
      : parseWorkers(maybeWorkerNamesString);

  const workerNamesNotFoundInWorkersConfig = workersToGetLogsFor.filter(
    (workerName) => !workerNamesSet.includes(workerName)
  );

  if (workerNamesNotFoundInWorkersConfig.length !== 0) {
    commandObj.error(
      `Wasn't able to find workers ${workerNamesNotFoundInWorkersConfig
        .map((workerName) => color.yellow(workerName))
        .join(", ")} in ${color.yellow(
        WORKERS_CONFIG_FILE_NAME
      )} please check the spelling and try again`
    );
  }

  return {
    workers: Object.entries(hosts)
      .filter(([name]) => workersToGetLogsFor.includes(name))
      .map(([name, config]) => ({ name, ...config })),
  };
};
