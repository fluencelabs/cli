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

import { writeFile } from "fs/promises";
import assert from "node:assert";
import { join } from "node:path";
import { isAbsolute, resolve } from "path/posix";

import {
  krasnodar,
  stage,
  testNet,
  type Node as AddrAndPeerId,
} from "@fluencelabs/fluence-network-environment";
// TODO: replace with dynamic import
import { multiaddr } from "@multiformats/multiaddr";
import { color } from "@oclif/color";
import sample from "lodash-es/sample.js";

import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { initNewReadonlyProviderConfig } from "./configs/project/provider.js";
import {
  ENV_FLAG_NAME,
  FLUENCE_ENVS,
  isFluenceEnv,
  type FluenceEnv,
  CONTRACTS_ENV,
  type PublicFluenceEnv,
  WEB_SOCKET_PORT_START,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
} from "./const.js";
import type { ProviderConfigArgs } from "./generateUserProviderConfig.js";
import { commaSepStrToArr, jsonStringify } from "./helpers/utils.js";
import {
  base64ToUint8Array,
  getSecretKeyOrReturnExisting,
} from "./keyPairs.js";
import { projectRootDir } from "./paths.js";
import { input, list } from "./prompt.js";

export async function fluenceEnvPrompt(
  message = "Select Fluence Environment to use by default with this project",
  defaultVal: FluenceEnv = "kras",
): Promise<FluenceEnv> {
  return list({
    message,
    options: [...FLUENCE_ENVS],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
    default: defaultVal,
  });
}

async function ensureValidFluenceEnvFlag(
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

export async function ensureValidFluenceEnv(envFlag: string | undefined) {
  return (await ensureValidFluenceEnvFlag(envFlag)) ?? fluenceEnvPrompt();
}

export async function resolveFluenceEnv(
  fluenceEnvFromFlagsNotValidated: string | undefined,
): Promise<FluenceEnv> {
  const fluenceEnvFromFlags = await ensureValidFluenceEnvFlag(
    fluenceEnvFromFlagsNotValidated,
  );

  const fluenceEnv = fluenceEnvFromFlags ?? envConfig?.fluenceEnv;

  if (fluenceEnv !== undefined) {
    return fluenceEnv;
  }

  const fluenceEnvFromPrompt = await fluenceEnvPrompt();

  if (envConfig === null) {
    return fluenceEnvFromPrompt;
  }

  envConfig.fluenceEnv = fluenceEnvFromPrompt;
  await envConfig.$commit();
  return fluenceEnvFromPrompt;
}

export function addrsToNodes(multiaddrs: string[]): AddrAndPeerId[] {
  return multiaddrs.map((multiaddr) => {
    return {
      peerId: getPeerId(multiaddr),
      multiaddr,
    };
  });
}

export async function getPeerIdFromSecretKey(secretKey: string) {
  const { KeyPair } = await import("@fluencelabs/js-client");
  const keyPair = await KeyPair.fromEd25519SK(base64ToUint8Array(secretKey));
  return keyPair.getPeerId();
}

async function ensureLocalAddrsAndPeerIds(args: ProviderConfigArgs) {
  return (await getResolvedProviderConfig(args)).map(
    ({ peerId, webSocketPort }): AddrAndPeerId => {
      return {
        multiaddr: `/ip4/127.0.0.1/tcp/${webSocketPort}/ws/p2p/${peerId}`,
        peerId,
      };
    },
  );
}

const ADDR_MAP: Record<PublicFluenceEnv, Array<AddrAndPeerId>> = {
  kras: krasnodar,
  stage,
  testnet: testNet,
};

export async function ensureCustomAddrsAndPeerIds(
  fluenceConfig: FluenceConfig | null,
) {
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
  return addrsToNodes(fluenceEnvOrCustomRelays);
}

type ResolveNodesArgs = {
  fluenceEnv: FluenceEnv;
  maybeFluenceConfig: FluenceConfig | null;
  noxes?: number | undefined;
};

export async function resolveAddrsAndPeerIds({
  fluenceEnv,
  maybeFluenceConfig,
  noxes,
}: ResolveNodesArgs): Promise<AddrAndPeerId[]> {
  if (fluenceEnv === "custom") {
    return ensureCustomAddrsAndPeerIds(maybeFluenceConfig);
  }

  if (fluenceEnv === "local") {
    return ensureLocalAddrsAndPeerIds({ noxes, env: "local" });
  }

  return ADDR_MAP[fluenceEnv];
}

export async function resolveRelays(
  args: ResolveNodesArgs,
): Promise<Array<string>> {
  return (await resolveAddrsAndPeerIds(args)).map((node) => {
    return node.multiaddr;
  });
}

/**
 * @param maybeRelayName - name of the relay in format `networkName-index`
 * @returns undefined if name is not in format `networkName-index` or AddrAndPeerId if it is
 */
async function getMaybeNamedAddrAndPeerId(
  maybeRelayName: string | undefined,
  maybeFluenceConfig: FluenceConfig | null,
): Promise<(AddrAndPeerId & { fluenceEnv: FluenceEnv }) | undefined> {
  if (maybeRelayName === undefined) {
    return undefined;
  }

  const fluenceEnv = FLUENCE_ENVS.find((networkName) => {
    return maybeRelayName.startsWith(networkName);
  });

  // if ID doesn't start with network name - return undefined
  if (fluenceEnv === undefined) {
    return undefined;
  }

  const relays = await resolveAddrsAndPeerIds({
    fluenceEnv,
    maybeFluenceConfig,
  });

  const [, indexString] = maybeRelayName.split("-");
  const parseResult = parseNamedPeer(indexString, fluenceEnv, relays.length);

  if (typeof parseResult === "string") {
    commandObj.error(
      `Can't parse address ${color.yellow(maybeRelayName)}: ${parseResult}`,
    );
  }

  const relay = relays[parseResult];

  if (relay === undefined) {
    return undefined;
  }

  return { ...relay, fluenceEnv };
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

async function getRandomRelayAddr(args: ResolveNodesArgs): Promise<string> {
  const r = sample(await resolveRelays(args));

  assert(
    r !== undefined,
    "Unreachable. resolveRelays must have returned a non-empty array",
  );

  return r;
}

export async function resolveRelay({
  relayFromFlags,
  fluenceEnvFromFlags,
  ...args
}: {
  relayFromFlags: string | undefined;
  fluenceEnvFromFlags: string | undefined;
} & Omit<ResolveNodesArgs, "fluenceEnv">) {
  const namedAddr = await getMaybeNamedAddrAndPeerId(
    relayFromFlags,
    args.maybeFluenceConfig,
  );

  if (namedAddr !== undefined) {
    commandObj.logToStderr(
      `Connecting to ${color.yellow(namedAddr.fluenceEnv)} relay: ${
        namedAddr.multiaddr
      }`,
    );

    return namedAddr.multiaddr;
  }

  if (relayFromFlags !== undefined) {
    commandObj.logToStderr(
      `Connecting to relay: ${color.yellow(relayFromFlags)}`,
    );

    return relayFromFlags;
  }

  const fluenceEnv = await resolveFluenceEnv(fluenceEnvFromFlags);
  const randomRelay = await getRandomRelayAddr({ ...args, fluenceEnv });

  commandObj.logToStderr(
    `Connecting to random ${color.yellow(fluenceEnv)} relay: ${color.yellow(
      randomRelay,
    )}`,
  );

  return randomRelay;
}

export async function resolvePeerId(
  peerIdOrNamedNode: string,
  maybeFluenceConfig: FluenceConfig | null,
) {
  return (
    (await getMaybeNamedAddrAndPeerId(peerIdOrNamedNode, maybeFluenceConfig))
      ?.peerId ?? peerIdOrNamedNode
  );
}

export async function getRandomPeerId(args: ResolveNodesArgs): Promise<string> {
  return getPeerId(await getRandomRelayAddr(args));
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

type UpdateRelaysJSONArgs = {
  fluenceConfig: FluenceConfig | null;
  noxes?: number | undefined;
};

export async function updateRelaysJSON({
  fluenceConfig,
  noxes,
}: UpdateRelaysJSONArgs) {
  if (
    typeof fluenceConfig?.relaysPath !== "string" ||
    envConfig?.fluenceEnv === undefined
  ) {
    return;
  }

  if (isAbsolute(fluenceConfig.relaysPath)) {
    commandObj.error(
      `relaysPath must be relative to the root project directory. Found: ${
        fluenceConfig.relaysPath
      } at ${fluenceConfig.$getPath()}}`,
    );
  }

  const relays = await resolveAddrsAndPeerIds({
    fluenceEnv: envConfig.fluenceEnv,
    maybeFluenceConfig: fluenceConfig,
    noxes,
  });

  await writeFile(
    join(resolve(projectRootDir, fluenceConfig.relaysPath), "relays.json"),
    jsonStringify(relays),
  );
}

type ResolvedProviderConfig = {
  name: string;
  webSocketPort: number;
  peerId: string;
  computeUnits: number;
};

export async function getResolvedProviderConfig(
  args: ProviderConfigArgs,
): Promise<ResolvedProviderConfig[]> {
  const providerConfig = await initNewReadonlyProviderConfig(args);
  return Promise.all(
    Object.entries(providerConfig.computePeers).map(async ([name, peer], i) => {
      const {
        nox: { websocketPort: webSocketPortFromConfig } = {},
        computeUnits = DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
      } = peer;

      const webSocketPort =
        webSocketPortFromConfig ?? WEB_SOCKET_PORT_START + i;

      const { secretKey } = await getSecretKeyOrReturnExisting(name);

      return {
        name,
        webSocketPort,
        peerId: await getPeerIdFromSecretKey(secretKey),
        computeUnits,
      };
    }),
  );
}
