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
  type FluenceClientFlags,
  type FluenceEnv,
  type KeyPairFlag,
} from "./const.js";
import { stringifyUnknown } from "./helpers/utils.js";
import { base64ToUint8Array, getExistingSecretKey } from "./keyPairs.js";
import { resolveRelay } from "./multiaddres.js";

export const initFluenceClient = async (
  {
    relay: maybeRelay,
    sk: secretKeyName,
    ["dial-timeout"]: dialTimeoutMs,
    ttl,
    "particle-id": printParticleId,
  }: FluenceClientFlags & KeyPairFlag,
  maybeFluenceConfig: FluenceConfig | null,
  fluenceEnv: FluenceEnv,
): Promise<void> => {
  const relay = await resolveRelay({
    fluenceEnv,
    maybeFluenceConfig,
    maybeRelay,
  });

  commandObj.logToStderr(
    `Connecting to ${color.yellow(fluenceEnv)} relay: ${relay}`,
  );

  const secretKey = await getExistingSecretKey(secretKeyName);

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
        source: base64ToUint8Array(secretKey),
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
