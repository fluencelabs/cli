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

import assert from "assert";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  get_logs,
  Get_logsArgApp_workers,
} from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  initReadonlyWorkersConfig,
  WorkersConfigReadonly,
} from "../../lib/configs/project/workers.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  WORKERS_CONFIG_FILE_NAME,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FILE_NAME,
  FLUENCE_DIR_NAME,
  FLUENCE_CLIENT_FLAGS,
} from "../../lib/const.js";
import { parseWorkers } from "../../lib/deployWorkers.js";
import { initFluenceClient } from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { confirm, input } from "../../lib/prompt.js";

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Get logs from deployed workers listed in ${WORKERS_CONFIG_FILE_NAME}`;
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
    deals: Flags.boolean({
      exclusive: ["hosts"],
      description: `Get logs from workers deployed with deals (using 'deals' property of ${FLUENCE_CONFIG_FILE_NAME}). Use this flag if deployed both directly and with deals to distinguish which logs do you want to see. If you used only one type of deployment - it will be selected automatically by default`,
    }),
    hosts: Flags.boolean({
      exclusive: ["deals"],
      description: `Get logs from workers deployed directly without deals (using 'hosts' property of ${FLUENCE_CONFIG_FILE_NAME}). Use this flag if deployed both directly and with deals to distinguish which logs do you want to see. If you used only one type of deployment - it will be selected automatically by default`,
    }),
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Names of workers to deploy (by default all deals from 'deals' property of ${FLUENCE_CONFIG_FILE_NAME} are deployed)`,
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(Logs)
    );

    const fluenceClient = await initFluenceClient(flags, maybeFluenceConfig);
    doRegisterLog(fluenceClient, flags["off-aqua-logs"]);

    const logsArg = await getLogsArg({
      workerNamesString: args["WORKER-NAMES"],
      maybeWorkerId: flags["worker-id"],
      maybeHostId: flags["host-id"],
      spellId: flags["spell-id"],
      isGettingLogsForDealsWorkers: flags.deals,
      isGettingLogsForHostsWorkers: flags.hosts,
    });

    const logs = await get_logs(fluenceClient, logsArg);

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
  workerNamesString: string | undefined;
  maybeWorkerId: string | undefined;
  maybeHostId: string | undefined;
  spellId: string;
  isGettingLogsForDealsWorkers: boolean;
  isGettingLogsForHostsWorkers: boolean;
};

const getLogsArg = async ({
  workerNamesString,
  maybeWorkerId,
  maybeHostId,
  spellId,
  isGettingLogsForDealsWorkers,
  isGettingLogsForHostsWorkers,
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
      )} in ${FLUENCE_DIR_NAME} directory. Make sure you have deployed workers before trying to get logs`
    );
  }

  const workersConfig = maybeWorkersConfig;

  const dealsOrHosts = await resolveDealsOrHosts(
    workersConfig,
    isGettingLogsForDealsWorkers,
    isGettingLogsForHostsWorkers
  );

  const workerNamesSet = Object.keys(dealsOrHosts);

  const workersToGetLogsFor =
    workerNamesString === undefined
      ? workerNamesSet
      : parseWorkers(workerNamesString);

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

  const workers = // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    Object.entries(dealsOrHosts) as Array<
      [
        string,
        Exclude<
          (typeof workersConfig)["deals"] | (typeof workersConfig)["hosts"],
          undefined
        >[string]
      ]
    >;

  return {
    workers: workers
      .filter(([name]) => workersToGetLogsFor.includes(name))
      .map(([name, config]) => ({ name, ...config })),
  };
};

const resolveDealsOrHosts = async (
  workersConfig: WorkersConfigReadonly,
  isGettingLogsForDealsWorkers: boolean,
  isGettingLogsForHostsWorkers: boolean
): Promise<
  Exclude<
    WorkersConfigReadonly["deals"] | WorkersConfigReadonly["hosts"],
    undefined
  >
> => {
  const { deals, hosts } = workersConfig;

  if (isGettingLogsForDealsWorkers && deals !== undefined) {
    return deals;
  }

  if (isGettingLogsForDealsWorkers && deals === undefined) {
    return commandObj.error(
      `Seems like you didn't deploy workers with deals (using 'deals' property of ${FLUENCE_CONFIG_FILE_NAME}), because there is no 'deals' property in ${color.yellow(
        workersConfig.$getPath()
      )}`
    );
  }

  if (isGettingLogsForHostsWorkers && hosts !== undefined) {
    return hosts;
  }

  if (isGettingLogsForHostsWorkers && hosts === undefined) {
    return commandObj.error(
      `Seems like you didn't deploy workers directly (using 'hosts' property of ${FLUENCE_CONFIG_FILE_NAME}), because there is no 'hosts' property in ${color.yellow(
        workersConfig.$getPath()
      )}`
    );
  }

  if (deals === undefined && hosts === undefined) {
    return commandObj.error(
      `Neither 'deals' nor 'hosts' property is defined in ${color.yellow(
        WORKERS_CONFIG_FILE_NAME
      )}`
    );
  }

  if (deals === undefined && hosts !== undefined) {
    return hosts;
  }

  if (deals !== undefined && hosts === undefined) {
    return deals;
  }

  assert(deals !== undefined && hosts !== undefined);

  return (await confirm({
    message: `Seems like you deployed workers both directly (using 'hosts' property of ${FLUENCE_CONFIG_FILE_NAME}) and with deals (using 'deals' property of ${FLUENCE_CONFIG_FILE_NAME}). Do you want to see logs for workers deployed using deals?`,
  }))
    ? deals
    : hosts;
};
