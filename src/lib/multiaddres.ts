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
  type Node,
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
} from "./const.js";
import type { ProviderConfigArgs } from "./generateUserProviderConfig.js";
import { commaSepStrToArr, jsonStringify } from "./helpers/utils.js";
import {
  base64ToUint8Array,
  getSecretKeyOrReturnExisting,
} from "./keyPairs.js";
import { projectRootDir } from "./paths.js";
import { input, list } from "./prompt.js";

export async function fluenceEnvPrompt(): Promise<FluenceEnv> {
  return list({
    message: `Select Fluence Environment to use by default with this project`,
    options: [...FLUENCE_ENVS],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
    default: "kras" as const,
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

  if (envConfig === null) {
    return fluenceEnvFromPrompt;
  }

  envConfig.fluenceEnv = fluenceEnvFromPrompt;
  await envConfig.$commit();
  return fluenceEnvFromPrompt;
}

export function multiaddrsToNodes(multiaddrs: string[]): Node[] {
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

async function ensureLocalNodes(numberOfNoxes?: number | undefined) {
  return (await getResolvedProviderConfig({ numberOfNoxes })).map(
    ({ peerId, port }): Node => {
      return {
        multiaddr: `/ip4/127.0.0.1/tcp/${port}/ws/p2p/${peerId}`,
        peerId,
      };
    },
  );
}

const ADDR_MAP: Record<PublicFluenceEnv, Array<Node>> = {
  kras: krasnodar,
  stage,
  testnet: testNet,
};

export async function ensureCustomNodes(fluenceConfig: FluenceConfig | null) {
  if (fluenceConfig === null) {
    commandObj.error(
      `You must init fluence project if you want to use ${color.yellow(
        "custom",
      )} fluence env`,
    );
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
  return multiaddrsToNodes(fluenceEnvOrCustomRelays);
}

type ResolveNodesArgs = {
  fluenceEnv: FluenceEnv;
  maybeFluenceConfig: FluenceConfig | null;
  numberOfNoxes?: number | undefined;
};

export async function resolveNodes({
  fluenceEnv,
  maybeFluenceConfig,
  numberOfNoxes,
}: ResolveNodesArgs): Promise<Node[]> {
  if (fluenceEnv === "custom") {
    return ensureCustomNodes(maybeFluenceConfig);
  }

  if (fluenceEnv === "local") {
    return ensureLocalNodes(numberOfNoxes);
  }

  return ADDR_MAP[fluenceEnv];
}

export async function resolveRelays(
  args: ResolveNodesArgs,
): Promise<Array<string>> {
  return (await resolveNodes(args)).map((node) => {
    return node.multiaddr;
  });
}

/**
 * @param maybeRelayName - name of the relay in format `networkName-index`
 * @returns undefined if name is not in format `networkName-index` or Node if it is
 */
async function getMaybeNamedNode(
  maybeRelayName: string | undefined,
  maybeFluenceConfig: FluenceConfig | null,
): Promise<Node | undefined> {
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

  const relays = await resolveNodes({ fluenceEnv, maybeFluenceConfig });
  const [, indexString] = maybeRelayName.split("-");
  const parseResult = parseNamedPeer(indexString, fluenceEnv, relays.length);

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

async function getRandomRelayAddr(args: ResolveNodesArgs): Promise<string> {
  const r = sample(await resolveRelays(args));

  assert(
    r !== undefined,
    "Unreachable. resolveRelays must have returned a non-empty array",
  );

  return r;
}

export async function resolveRelay({
  maybeRelay,
  ...args
}: { maybeRelay: string | undefined } & ResolveNodesArgs) {
  return (
    (await getMaybeNamedNode(maybeRelay, args.maybeFluenceConfig))?.multiaddr ??
    maybeRelay ??
    (await getRandomRelayAddr(args))
  );
}

export async function resolvePeerId(
  peerIdOrNamedNode: string,
  maybeFluenceConfig: FluenceConfig | null,
) {
  return (
    (await getMaybeNamedNode(peerIdOrNamedNode, maybeFluenceConfig))?.peerId ??
    peerIdOrNamedNode
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
  numberOfNoxes?: number | undefined;
};

export async function updateRelaysJSON({
  fluenceConfig,
  numberOfNoxes,
}: UpdateRelaysJSONArgs) {
  if (
    !(
      typeof fluenceConfig?.relaysPath === "string" &&
      envConfig?.fluenceEnv !== undefined
    )
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

  const relays = await resolveNodes({
    fluenceEnv: envConfig.fluenceEnv,
    maybeFluenceConfig: fluenceConfig,
    numberOfNoxes,
  });

  await writeFile(
    join(resolve(projectRootDir, fluenceConfig.relaysPath), "relays.json"),
    jsonStringify(relays),
  );
}

export async function getResolvedProviderConfig(args: ProviderConfigArgs = {}) {
  const providerConfig = await initNewReadonlyProviderConfig(args);
  return Promise.all(
    Object.entries(providerConfig.computePeers).map(
      async ([name, { port: portFromConfig, worker = 1 }], i) => {
        let port = portFromConfig;

        if (port === undefined) {
          port = `${WEB_SOCKET_PORT_START + i}`;
        }

        const { secretKey } = await getSecretKeyOrReturnExisting(name);

        return {
          name,
          port,
          peerId: await getPeerIdFromSecretKey(secretKey),
          worker,
        };
      },
    ),
  );
}
