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

import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import { type FluenceClientFlags } from "./const.js";
import { stringifyUnknown } from "./helpers/utils.js";
import { base64ToUint8Array } from "./keyPairs.js";
import { resolveRelay } from "./multiaddres.js";
import { getExistingSecretKey } from "./secretKeys.js";

export const initFluenceClient = async ({
  relay: relayFromFlags,
  sk: secretKeyName,
  ["dial-timeout"]: dialTimeoutMs,
  ttl,
  "particle-id": printParticleId,
}: FluenceClientFlags): Promise<void> => {
  const relay = await resolveRelay(relayFromFlags);
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
