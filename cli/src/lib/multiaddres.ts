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

import { writeFile, mkdir } from "fs/promises";
import assert from "node:assert";
import { isAbsolute, join, resolve } from "node:path";

import { type Node as AddrAndPeerId } from "@fluencelabs/fluence-network-environment";
import { color } from "@oclif/color";
import sample from "lodash-es/sample.js";

import { jsonStringify } from "../common.js";

import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import { initFluenceConfig } from "./configs/project/fluence.js";
import { ensureComputerPeerConfigs } from "./configs/project/provider.js";
import { FLUENCE_ENVS, type FluenceEnv } from "./const.js";
import { numToStr } from "./helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "./helpers/utils.js";
import {
  getPeerId,
  resolveAddrsAndPeerIdsWithoutLocal,
} from "./multiaddresWithoutLocal.js";
import { projectRootDir } from "./paths.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

async function ensureLocalAddrsAndPeerIds() {
  return (await ensureComputerPeerConfigs()).map(
    ({ peerId, overriddenNoxConfig }): AddrAndPeerId => {
      return {
        multiaddr: `/ip4/127.0.0.1/tcp/${numToStr(overriddenNoxConfig.websocketPort)}/ws/p2p/${peerId}`,
        peerId,
      };
    },
  );
}

export async function resolveAddrsAndPeerIds(): Promise<AddrAndPeerId[]> {
  const fluenceEnv = await ensureFluenceEnv();

  if (fluenceEnv === "local") {
    return ensureLocalAddrsAndPeerIds();
  }

  return resolveAddrsAndPeerIdsWithoutLocal(fluenceEnv);
}

export async function resolveRelays(): Promise<Array<string>> {
  return (await resolveAddrsAndPeerIds()).map((node) => {
    return node.multiaddr;
  });
}

/**
 * @param maybeRelayName - name of the relay in format `networkName-index`
 * @returns undefined if name is not in format `networkName-index` or AddrAndPeerId if it is
 */
async function getMaybeNamedAddrAndPeerId(
  maybeRelayName: string | undefined,
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

  const relays = await resolveAddrsAndPeerIds();
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
    return `Index ${numToStr(index)} is out of range`;
  }

  return index;
}

async function getRandomRelayAddr(): Promise<string> {
  const r = sample(await resolveRelays());

  assert(
    r !== undefined,
    "Unreachable. resolveRelays must have returned a non-empty array",
  );

  return r;
}

export async function resolveRelay(relayFromFlags: string | undefined) {
  const namedAddr = await getMaybeNamedAddrAndPeerId(relayFromFlags);

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

  const fluenceEnv = await ensureFluenceEnv();
  const randomRelay = await getRandomRelayAddr();

  commandObj.logToStderr(
    `Connecting to random ${color.yellow(fluenceEnv)} relay: ${color.yellow(
      randomRelay,
    )}`,
  );

  return randomRelay;
}

export async function resolvePeerId(peerIdOrNamedNode: string) {
  return (
    (await getMaybeNamedAddrAndPeerId(peerIdOrNamedNode))?.peerId ??
    peerIdOrNamedNode
  );
}

export async function getRandomPeerId(): Promise<string> {
  return getPeerId(await getRandomRelayAddr());
}

export async function updateRelaysJSON() {
  const fluenceConfig = await initFluenceConfig();

  if (
    fluenceConfig?.relaysPath === undefined ||
    envConfig?.fluenceEnv === undefined
  ) {
    return;
  }

  const relayPaths =
    typeof fluenceConfig.relaysPath === "string"
      ? [fluenceConfig.relaysPath]
      : fluenceConfig.relaysPath;

  const relays = await resolveAddrsAndPeerIds();

  const [absolutePaths, relativePaths] = splitErrorsAndResults(
    relayPaths,
    (relayPath) => {
      return isAbsolute(relayPath)
        ? { error: relayPath }
        : { result: relayPath };
    },
  );

  if (absolutePaths.length > 0) {
    commandObj.error(
      `relaysPath must contain only paths relative to the root project directory. Found: ${absolutePaths.join(
        "\n",
      )}`,
    );
  }

  await Promise.all(
    relativePaths.map(async (relativePath) => {
      const relaysDir = resolve(projectRootDir, relativePath);
      await mkdir(relaysDir, { recursive: true });
      return writeFile(join(relaysDir, "relays.json"), jsonStringify(relays));
    }),
  );
}
