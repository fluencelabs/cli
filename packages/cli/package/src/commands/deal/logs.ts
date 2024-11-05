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
import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import type { Get_logs_dealParams } from "../../lib/compiled-aqua/installation-spell/cli.js";
import {
  WORKER_SPELL,
  WORKERS_CONFIG_FULL_FILE_NAME,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  TTL_FLAG_NAME,
  DIAL_TIMEOUT_FLAG_NAME,
  TRACING_FLAG,
  DEPLOYMENT_NAMES_ARG,
  DEAL_IDS_FLAG,
} from "../../lib/const.js";
import { getDeals } from "../../lib/deal.js";
import {
  formatAquaLogsHeader,
  formatAquaLogs,
} from "../../lib/helpers/formatAquaLogs.js";
import { LOGS_RESOLVE_SUBNET_ERROR_START } from "../../lib/helpers/utils.js";
import { stringifyUnknown } from "../../lib/helpers/stringifyUnknown.js";
import {
  disconnectFluenceClient,
  initFluenceClient,
} from "../../lib/jsClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Logs extends BaseCommand<typeof Logs> {
  static override description = `Get logs from deployed workers for deals listed in ${WORKERS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...FLUENCE_CLIENT_FLAGS,
    ...OFF_AQUA_LOGS_FLAG,
    ...TRACING_FLAG,
    ...DEAL_IDS_FLAG,
    spell: Flags.string({
      description: `Spell name to get logs for`,
      helpValue: "<spell-name>",
      default: WORKER_SPELL,
    }),
  };
  static override args = {
    ...DEPLOYMENT_NAMES_ARG,
  };
  async run(): Promise<void> {
    const { flags, args } = await initCli(this, await this.parse(Logs));
    await initFluenceClient(flags);

    const dealIdWorkerNameMap = await getDealIdWorkerNameMap({ args, flags });

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
  argsAndFlags: Parameters<typeof getDeals>[0] & {
    flags: { spell: string };
  },
): Promise<
  Record<string, { deal_id: string; spell_name: string; worker_name: string }>
> {
  const workersToGetLogsFor = await getDeals(argsAndFlags);

  return Object.fromEntries(
    workersToGetLogsFor.map(({ dealId, dealName }) => {
      return [
        dealId,
        {
          deal_id: dealId,
          spell_name: argsAndFlags.flags.spell,
          worker_name: dealName,
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
