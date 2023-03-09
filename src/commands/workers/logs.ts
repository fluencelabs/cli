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
  Get_logsArgApp_workers,
} from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initReadonlyDeployedConfig } from "../../lib/configs/project/deployed.js";
import {
  KEY_PAIR_FLAG,
  PRIV_KEY_FLAG,
  DEPLOYED_CONFIG_FILE_NAME,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CONFIG_FILE_NAME,
  FLUENCE_DIR_NAME,
  FLUENCE_CLIENT_FLAGS,
} from "../../lib/const.js";
import { parseWorkers } from "../../lib/deployWorkers.js";
import { initFluenceClient } from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { doRegisterLog } from "../../lib/localServices/log.js";
import { input } from "../../lib/prompt.js";

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Get logs from deployed workers listed in ${DEPLOYED_CONFIG_FILE_NAME}`;
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
};

const getLogsArg = async ({
  workerNamesString,
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

  const maybeDeployedConfig = await initReadonlyDeployedConfig();

  if (maybeDeployedConfig === null) {
    return commandObj.error(
      `Wasn't able to find ${color.yellow(
        DEPLOYED_CONFIG_FILE_NAME
      )} in ${FLUENCE_DIR_NAME} directory. Make sure you have deployed workers before trying to get logs`
    );
  }

  const deployedConfig = maybeDeployedConfig;
  const workerNamesSet = Object.keys(deployedConfig.workers);

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
        DEPLOYED_CONFIG_FILE_NAME
      )} please check the spelling and try again`
    );
  }

  return {
    workers: Object.entries(deployedConfig.workers)
      .filter(([name]) => workersToGetLogsFor.includes(name))
      .map(([name, config]) => ({ name, ...config })),
  };
};
