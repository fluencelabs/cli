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

import assert from "node:assert";

import {
  krasnodar,
  stage,
  testNet,
  type Node,
} from "@fluencelabs/fluence-network-environment";
// TODO: replace with dynamic import
import { multiaddr } from "@multiformats/multiaddr";
import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import type {
  FluenceConfig,
  FluenceConfigReadonly,
} from "./configs/project/fluence.js";
import {
  type ContractsENV,
  ENV_FLAG_NAME,
  FLUENCE_ENVS,
  isFluenceEnv,
  type FluenceEnv,
  CONTRACTS_ENV,
} from "./const.js";
import { commaSepStrToArr } from "./helpers/utils.js";
import { input, list } from "./prompt.js";

export function fluenceEnvPrompt(): Promise<FluenceEnv> {
  return list({
    message: `Select Fluence Environment to use by default with this project. Default: ${FLUENCE_ENVS[0]}`,
    options: [...FLUENCE_ENVS],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
  });
}

export async function ensureValidEnvFlag(
  envFlag: string | undefined,
): Promise<FluenceEnv | undefined> {
  if (envFlag === undefined) {
    return undefined;
  }

  if (!isFluenceEnv(envFlag)) {
    commandObj.warn(
      `Invalid flag: ${color.yellow(`--${ENV_FLAG_NAME} ${envFlag}`)}`,
    );

    return fluenceEnvPrompt();
  }

  return envFlag;
}

export async function resolveFluenceEnv(
  fluenceEnvFromFlagsNotValidated: string | undefined,
): Promise<FluenceEnv> {
  const fluenceEnvFromFlags = await ensureValidEnvFlag(
    fluenceEnvFromFlagsNotValidated,
  );

  const fluenceEnv = fluenceEnvFromFlags ?? envConfig?.fluenceEnv;

  if (fluenceEnv !== undefined) {
    return fluenceEnv;
  }

  const fluenceEnvFromPrompt = await fluenceEnvPrompt();

  if (envConfig === undefined) {
    return fluenceEnvFromPrompt;
  }

  envConfig.fluenceEnv = fluenceEnvFromPrompt;
  await envConfig.$commit();
  return fluenceEnvFromPrompt;
}

export const localMultiaddrs: string[] = [
  "/ip4/127.0.0.1/tcp/9991/ws/p2p/12D3KooWBM3SdXWqGaawQDGQ6JprtwswEg3FWGvGhmgmMez1vRbR",
  "/ip4/127.0.0.1/tcp/9992/ws/p2p/12D3KooWQdpukY3p2DhDfUfDgphAqsGu5ZUrmQ4mcHSGrRag6gQK",
  "/ip4/127.0.0.1/tcp/9993/ws/p2p/12D3KooWRT8V5awYdEZm6aAV9HWweCEbhWd7df4wehqHZXAB7yMZ",
];

export const localPeerIds: string[] = localMultiaddrs.map((multiaddr) => {
  return getPeerId(multiaddr);
});

export function multiaddrsToNodes(multiaddrs: string[]): Node[] {
  return multiaddrs.map((multiaddr) => {
    return {
      peerId: getPeerId(multiaddr),
      multiaddr,
    };
  });
}

export const local: Node[] = multiaddrsToNodes(localMultiaddrs);

const ADDR_MAP: Record<ContractsENV, Array<Node>> = {
  kras: krasnodar,
  stage,
  testnet: testNet,
  local,
};

export async function ensureCustomRelays(fluenceConfig: FluenceConfig) {
  const contractsEnv = await list({
    message: "Select contracts environment for your custom network",
    options: [...CONTRACTS_ENV],
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
  return fluenceEnvOrCustomRelays;
}

function getCustomRelays(
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
) {
  if (maybeFluenceConfigReadonly === null) {
    commandObj.error(
      `You must init fluence project if you want to use ${color.yellow(
        "custom",
      )} fluence env`,
    );
  }

  if (maybeFluenceConfigReadonly.customFluenceEnv === undefined) {
    commandObj.error(
      `You must specify custom fluence env in ${color.yellow(
        maybeFluenceConfigReadonly.$getPath(),
      )} if you want to use ${color.yellow("custom")} fluence environment`,
    );
  }

  return maybeFluenceConfigReadonly.customFluenceEnv.relays;
}

export function resolveRelays(
  fluenceEnv: FluenceEnv,
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
): Array<string> {
  if (fluenceEnv === "custom") {
    return getCustomRelays(maybeFluenceConfigReadonly);
  }

  return ADDR_MAP[fluenceEnv].map((node) => {
    return node.multiaddr;
  });
}

function getRandomArrayItem<T>(ar: Array<T>): T {
  const randomIndex = Math.round(Math.random() * (ar.length - 1));
  const randomItem = ar[randomIndex];
  assert(randomItem !== undefined);
  return randomItem;
}

/**
 * @param maybeRelayName - name of the relay in format `networkName-index`
 * @returns undefined if name is not in format `networkName-index` or Node if it is
 */
function getMaybeNamedNode(
  maybeRelayName: string | undefined,
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
): undefined | Node {
  if (maybeRelayName === undefined) {
    return undefined;
  }

  const maybeFluenceEnv = FLUENCE_ENVS.find((networkName) => {
    return maybeRelayName.startsWith(networkName);
  });

  // if ID doesn't start with network name - return undefined
  if (maybeFluenceEnv === undefined) {
    return undefined;
  }

  const relays =
    maybeFluenceEnv === "custom"
      ? multiaddrsToNodes(getCustomRelays(maybeFluenceConfigReadonly))
      : ADDR_MAP[maybeFluenceEnv];

  const [, indexString] = maybeRelayName.split("-");

  const parseResult = parseNamedPeer(
    indexString,
    maybeFluenceEnv,
    relays.length,
  );

  if (typeof parseResult === "string") {
    commandObj.error(
      `Can't parse address ${color.yellow(maybeRelayName)}: ${parseResult}`,
    );
  }

  return relays[parseResult];
}

function parseNamedPeer(
  indexString: string | undefined,
  fluenceEnv: FluenceEnv,
  relaysLength: number,
): number | string {
  if (indexString === undefined) {
    return `You must specify peer index after dash (e.g. ${color.yellow(
      `${fluenceEnv}-0`,
    )})`;
  }

  const index = Number(indexString);

  if (isNaN(index)) {
    return `Index ${color.yellow(indexString)} is not a number`;
  }

  if (index < 0 || index >= relaysLength) {
    return `Index ${index} is out of range`;
  }

  return index;
}

function getRandomRelayAddr(
  fluenceEnv: FluenceEnv,
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
): string {
  return getRandomArrayItem(
    resolveRelays(fluenceEnv, maybeFluenceConfigReadonly),
  );
}

export function resolveRelay(
  maybeRelay: string | undefined,
  fluenceEnv: FluenceEnv,
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
) {
  return (
    getMaybeNamedNode(maybeRelay, maybeFluenceConfigReadonly)?.multiaddr ??
    maybeRelay ??
    getRandomRelayAddr(fluenceEnv, maybeFluenceConfigReadonly)
  );
}

export function resolvePeerId(
  peerIdOrNamedNode: string,
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
) {
  return (
    getMaybeNamedNode(peerIdOrNamedNode, maybeFluenceConfigReadonly)?.peerId ??
    peerIdOrNamedNode
  );
}

export function getRandomPeerId(
  fluenceEnv: FluenceEnv,
  maybeFluenceConfigReadonly: FluenceConfigReadonly | null,
): string {
  return getPeerId(getRandomRelayAddr(fluenceEnv, maybeFluenceConfigReadonly));
}

export function getPeerId(addr: string): string {
  const id = multiaddr(addr).getPeerId();

  if (id === null) {
    return commandObj.error(
      `Can't extract peer id from multiaddr ${color.yellow(addr)}`,
    );
  }

  return id;
}
