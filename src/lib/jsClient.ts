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

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  ENV_FLAG_NAME,
  type FluenceClientFlags,
  type KeyPairFlag,
} from "./const.js";
import { base64ToUint8Array, stringifyUnknown } from "./helpers/utils.js";
import { getExistingKeyPair } from "./keyPairs.js";
import { resolveFluenceEnv, resolveRelay } from "./multiaddres.js";

export const initFluenceClient = async (
  {
    relay: maybeRelay,
    ["key-pair-name"]: keyPairName,
    ["dial-timeout"]: dialTimeoutMs,
    ttl,
    "particle-id": printParticleId,
    [ENV_FLAG_NAME]: envFlag,
  }: FluenceClientFlags & KeyPairFlag,
  maybeFluenceConfig: FluenceConfig | null,
): Promise<void> => {
  const fluenceEnv = await resolveFluenceEnv(envFlag);
  const relay = resolveRelay(maybeRelay, fluenceEnv, maybeFluenceConfig);

  commandObj.logToStderr(
    `Connecting to ${color.yellow(fluenceEnv)} relay: ${relay}`,
  );

  const keyPair = await getExistingKeyPair(keyPairName);

  try {
    const { Fluence } = await import("@fluencelabs/js-client");

    await Fluence.connect(relay, {
      connectionOptions: {
        dialTimeoutMs,
      },
      debug: {
        printParticleId,
      },
      defaultTtlMs: ttl,
      keyPair: {
        source: base64ToUint8Array(keyPair.secretKey),
        type: "Ed25519",
      },
    });

    commandObj.logToStderr(color.green(`Connected`));
  } catch (e) {
    commandObj.error(`Failed to connect. ${stringifyUnknown(e)}`);
  }
};

export async function disconnectFluenceClient() {
  const { Fluence } = await import("@fluencelabs/js-client");
  await Fluence.disconnect();
}
