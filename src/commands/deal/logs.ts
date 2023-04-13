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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { get_logs_deal } from "../../lib/compiled-aqua/installation-spell/cli.js";
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

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Get logs from deployed workers for deals listed in ${WORKERS_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...FLUENCE_CLIENT_FLAGS,
    ...KEY_PAIR_FLAG,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Worker names to get logs for (by default all worker names from 'deals' property of ${WORKERS_CONFIG_FILE_NAME})`,
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(Logs)
    );

    await initFluenceClient(flags, maybeFluenceConfig);

    const dealIdWorkerNameMap = await getDealIdWorkerNameMap(
      args["WORKER-NAMES"]
    );

    let logs;

    try {
      logs = await get_logs_deal(Object.keys(dealIdWorkerNameMap));
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
          ({ host_id, logs, spell_id, deal_id }) =>
            `${color.yellow(
              dealIdWorkerNameMap[deal_id] ?? "Unknown worker"
            )} (host_id: ${host_id}, spell_id: ${spell_id}, deal_id: ${deal_id}):\n\n${logs.join(
              "\n"
            )}`
        )
        .join("\n\n")
    );
  }
}

const getDealIdWorkerNameMap = async (
  maybeWorkerNamesString: string | undefined
): Promise<Record<string, string>> => {
  const maybeWorkersConfig = await initReadonlyWorkersConfig();

  if (maybeWorkersConfig === null) {
    return commandObj.error(
      `Wasn't able to find ${color.yellow(
        WORKERS_CONFIG_FILE_NAME
      )} in project's ${DOT_FLUENCE_DIR_NAME} directory. Make sure you have deployed before trying to get logs`
    );
  }

  const workersConfig = maybeWorkersConfig;

  const deals =
    workersConfig.deals ??
    commandObj.error(
      `No deployed workers found in ${color.yellow(
        "deals"
      )} property in ${color.yellow(workersConfig.$getPath())} file`
    );

  const workerNamesSet = Object.keys(deals);

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

  return Object.entries(deals)
    .filter(([name]) => workersToGetLogsFor.includes(name))
    .reduce<Record<string, string>>((acc, [name, config]) => {
      acc[config.dealId] = name;
      return acc;
    }, {});
};
