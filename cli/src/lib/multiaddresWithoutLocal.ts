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

import {
  type Node as AddrAndPeerId,
  stage,
  testNet,
  kras,
} from "@fluencelabs/fluence-network-environment";
import { multiaddr } from "@multiformats/multiaddr";
import { color } from "@oclif/color";

import { CHAIN_ENV, type PublicFluenceEnv } from "../common.js";

import { commandObj } from "./commandObj.js";
import { initFluenceConfig } from "./configs/project/fluence.js";
import type { FluenceEnv } from "./const.js";
import { commaSepStrToArr, stringifyUnknown } from "./helpers/utils.js";
import { input, list } from "./prompt.js";

export function getPeerId(addr: string): string {
  const id = multiaddr(addr).getPeerId();

  if (id === null) {
    return commandObj.error(
      `Can't extract peer id from multiaddr ${color.yellow(addr)}`,
    );
  }

  return id;
}

export function addrsToNodes(multiaddrs: string[]): AddrAndPeerId[] {
  return multiaddrs.map((multiaddr) => {
    return {
      peerId: getPeerId(multiaddr),
      multiaddr,
    };
  });
}

export async function ensureCustomAddrsAndPeerIds() {
  const fluenceConfig = await initFluenceConfig();

  if (fluenceConfig === null) {
    commandObj.error(
      `You must init fluence project if you want to use ${color.yellow(
        "custom",
      )} fluence env`,
    );
  }

  if (fluenceConfig.customFluenceEnv?.relays !== undefined) {
    let res;

    try {
      res = addrsToNodes(fluenceConfig.customFluenceEnv.relays);
    } catch (e) {
      commandObj.error(
        `${fluenceConfig.$getPath()} at ${color.yellow(
          "customFluenceEnv.relays",
        )}: ${stringifyUnknown(e)}`,
      );
    }

    return res;
  }

  const contractsEnv = await list({
    message: "Select contracts environment for your custom network",
    options: [...CHAIN_ENV],
    oneChoiceMessage: (): never => {
      throw new Error("Unreachable: only one contracts env");
    },
    onNoChoices: (): never => {
      throw new Error("Unreachable: no contracts envs");
    },
  });

  const fluenceEnvOrCustomRelays = commaSepStrToArr(
    await input({
      message: "Enter comma-separated list of relays",
      validate: (input: string) => {
        const relays = commaSepStrToArr(input);

        if (relays.length === 0) {
          return "You must specify at least one relay";
        }

        return true;
      },
    }),
  );

  fluenceConfig.customFluenceEnv = {
    contractsEnv,
    relays: fluenceEnvOrCustomRelays,
  };

  await fluenceConfig.$commit();
  return addrsToNodes(fluenceEnvOrCustomRelays);
}

const ADDR_MAP: Record<PublicFluenceEnv, Array<AddrAndPeerId>> = {
  kras,
  dar: testNet,
  stage,
};

export async function resolveAddrsAndPeerIdsWithoutLocal(
  env: Exclude<FluenceEnv, "local">,
): Promise<AddrAndPeerId[]> {
  if (env === "custom") {
    return ensureCustomAddrsAndPeerIds();
  }

  return ADDR_MAP[env];
}

export async function resolveRelaysWithoutLocal(
  env: Exclude<FluenceEnv, "local">,
): Promise<Array<string>> {
  return (await resolveAddrsAndPeerIdsWithoutLocal(env)).map((node) => {
    return node.multiaddr;
  });
}
