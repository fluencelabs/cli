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
import type { Get_logs_dealParams } from "../../lib/compiled-aqua/installation-spell/cli.js";
import { initNewWorkersConfigReadonly } from "../../lib/configs/project/workers.js";
import {
  WORKER_SPELL,
  PRIV_KEY_FLAG,
  WORKERS_CONFIG_FULL_FILE_NAME,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  TTL_FLAG_NAME,
  DIAL_TIMEOUT_FLAG_NAME,
  TRACING_FLAG,
  type FluenceEnv,
  ENV_FLAG_NAME,
} from "../../lib/const.js";
import {
  formatAquaLogsHeader,
  formatAquaLogs,
} from "../../lib/helpers/formatAquaLogs.js";
import {
  LOGS_RESOLVE_SUBNET_ERROR_START,
  stringifyUnknown,
  commaSepStrToArr,
} from "../../lib/helpers/utils.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Get logs from deployed workers for deals listed in ${WORKERS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...FLUENCE_CLIENT_FLAGS,
    ...OFF_AQUA_LOGS_FLAG,
    ...PRIV_KEY_FLAG,
    ...TRACING_FLAG,
  };
  static override args = {
    "WORKER-NAMES": Args.string({
      description: `Worker names to get logs for (by default all worker names from 'deals' property of ${WORKERS_CONFIG_FULL_FILE_NAME})`,
    }),
    "SPELL-NAME": Args.string({
      description: `Spell name to get logs for (Default: ${WORKER_SPELL})`,
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(Logs),
    );

    await initFluenceClient(flags, maybeFluenceConfig);
    const fluenceEnv = await resolveFluenceEnv(flags[ENV_FLAG_NAME]);

    const dealIdWorkerNameMap = await getDealIdWorkerNameMap(
      args["WORKER-NAMES"],
      args["SPELL-NAME"],
      fluenceEnv,
    );

    let logs;

    try {
      logs = await getLogsDeal(flags.tracing, [
        Object.values(dealIdWorkerNameMap),
      ]);
    } catch (e) {
      commandObj.error(
        `Wasn't able to get logs. You can try increasing --${TTL_FLAG_NAME} and --${DIAL_TIMEOUT_FLAG_NAME}: ${stringifyUnknown(
          e,
        )}`,
      );
    }

    commandObj.log(
      logs
        .flatMap(({ error, logs, deal_id }) => {
          const worker_name = dealIdWorkerNameMap[deal_id]?.worker_name;

          if (typeof error === "string") {
            const header = formatAquaLogsHeader({
              worker_name,
              deal_id,
            });

            const trimmedError = error.trim();

            return [
              `${header}${color.red(
                trimmedError === ""
                  ? `${LOGS_RESOLVE_SUBNET_ERROR_START}Unknown error when resolving subnet`
                  : trimmedError,
              )}`,
            ];
          }

          return logs.map((l) => {
            return formatAquaLogs({ ...l, worker_name });
          });
        })
        .join("\n\n"),
    );

    await disconnectFluenceClient();
  }
}

async function getDealIdWorkerNameMap(
  maybeWorkerNamesString: string | undefined,
  spellName: string | undefined,
  fluenceEnv: FluenceEnv,
): Promise<
  Record<string, { deal_id: string; spell_name: string; worker_name: string }>
> {
  const workersConfig = await initNewWorkersConfigReadonly();

  const deals =
    workersConfig.deals?.[fluenceEnv] ??
    commandObj.error(
      `No deployed workers found at ${color.yellow(
        `deals.${fluenceEnv}`,
      )} in ${color.yellow(workersConfig.$getPath())}`,
    );

  const workerNamesSet = Object.keys(deals);

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

  return Object.fromEntries(
    Object.entries(deals)
      .filter(([name]) => {
        return workersToGetLogsFor.includes(name);
      })
      .map(([name, deal]) => {
        return [
          deal.dealIdOriginal,
          {
            deal_id: deal.dealIdOriginal,
            spell_name: spellName ?? WORKER_SPELL,
            worker_name: name,
          },
        ] as const;
      }),
  );
}

async function getLogsDeal(
  tracing: boolean,
  getLogDealParams: Get_logs_dealParams,
) {
  if (tracing) {
    const { get_logs_deal } = await import(
      "../../lib/compiled-aqua-with-tracing/installation-spell/cli.js"
    );

    return get_logs_deal(...getLogDealParams);
  }

  const { get_logs_deal } = await import(
    "../../lib/compiled-aqua/installation-spell/cli.js"
  );

  return get_logs_deal(...getLogDealParams);
}
