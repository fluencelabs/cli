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

import { createClient } from "@fluencelabs/js-client.node";
import type { FluencePeer } from "@fluencelabs/js-peer/dist/js-peer/FluencePeer.js";

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import type {
  FluenceClientFlags,
  KeyPairFlag,
  OffAquaLogsFlag,
} from "./const.js";
import { base64ToUint8Array } from "./helpers/generateKeyPair.js";
import { getExistingKeyPair } from "./keyPairs.js";
import { doRegisterLog } from "./localServices/log.js";
import { getRandomRelayAddr } from "./multiaddres.js";

export const initFluenceClient = async (
  {
    relay: maybeRelay,
    ["key-pair-name"]: keyPairName,
    ["dial-timeout"]: dialTimeoutMs,
    ttl,
    "particle-id": printParticleId,
    "off-aqua-logs": offAquaLogs,
  }: FluenceClientFlags & KeyPairFlag & OffAquaLogsFlag,
  maybeFluenceConfig: FluenceConfig | null
): Promise<FluencePeer> => {
  const client = createClient();
  const relay = maybeRelay ?? getRandomRelayAddr(maybeFluenceConfig?.relays);

  const keyPair = await getExistingKeyPair(
    keyPairName ?? maybeFluenceConfig?.keyPairName
  );

  try {
    await client.connect(relay, {
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
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    commandObj.error(`Failed to connect to ${relay}. ${e}`);
  }

  doRegisterLog(client, offAquaLogs);
  return client;
};
