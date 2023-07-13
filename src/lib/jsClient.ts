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

import { Fluence } from "@fluencelabs/js-client.api";
import "@fluencelabs/js-client.node";
import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import type { FluenceClientFlags, KeyPairFlag } from "./const.js";
import { base64ToUint8Array } from "./helpers/generateKeyPair.js";
import { stringifyUnknown } from "./helpers/jsonStringify.js";
import { getExistingKeyPair } from "./keyPairs.js";
import { resolveRelay } from "./multiaddres.js";

export const initFluenceClient = async (
  {
    relay: maybeRelay,
    ["key-pair-name"]: keyPairName,
    ["dial-timeout"]: dialTimeoutMs,
    ttl,
    "particle-id": printParticleId,
  }: FluenceClientFlags & KeyPairFlag,
  maybeFluenceConfig: FluenceConfig | null,
): Promise<void> => {
  const relay = resolveRelay(maybeRelay, maybeFluenceConfig?.relays);
  commandObj.log(`Connecting to: ${color.yellow(relay)}`);
  const keyPair = await getExistingKeyPair(keyPairName);

  try {
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
  } catch (e) {
    commandObj.error(
      `Failed to connect to ${color.yellow(relay)}. ${stringifyUnknown(e)}`,
    );
  }
};
