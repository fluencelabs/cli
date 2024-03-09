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

import {
  type Node as AddrAndPeerId,
  stage,
  testNet,
} from "@fluencelabs/fluence-network-environment";
import { multiaddr } from "@multiformats/multiaddr";
import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import { initFluenceConfig } from "./configs/project/fluence.js";
import { CHAIN_ENV, type PublicFluenceEnv, type FluenceEnv } from "./const.js";
import { commaSepStrToArr } from "./helpers/utils.js";
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

function addrsToNodes(multiaddrs: string[]): AddrAndPeerId[] {
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
        )}: ${e instanceof Error ? e.message : String(e)}`,
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
  // kras: krasnodar,
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
