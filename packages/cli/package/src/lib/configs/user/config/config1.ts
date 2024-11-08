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

import { rm } from "fs/promises";

import { commandObj } from "../../../commandObj.js";
import { AUTO_GENERATED } from "../../../const.js";
import { genSecretKeyString, writeSecretKey } from "../../../keyPairs.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";
import { initReadonlyUserSecretsConfig } from "../userSecrets.js";

import type { Config as PrevConfig } from "./config0.js";

export type Config = {
  countlyConsent: boolean;
  defaultSecretKeyName: string;
};

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      countlyConsent: {
        type: "boolean",
        description: "Weather you consent to send usage data to Countly",
      },
      defaultSecretKeyName: {
        type: "string",
        description:
          "Secret key with this name will be used by default by js-client inside CLI to run Aqua code",
      },
    },
    required: ["countlyConsent", "defaultSecretKeyName"],
  },
  async migrate({ lastCheckForUpdates, ...config }) {
    if (lastCheckForUpdates !== undefined) {
      commandObj.log(
        `Use of 'lastCheckForUpdates' field is deprecated. It's currently advised to install CLI without using npm`,
      );
    }

    const userSecretsConfig = await initReadonlyUserSecretsConfig();

    await Promise.all(
      (userSecretsConfig?.keyPairs ?? []).map(({ name, secretKey }) => {
        return writeSecretKey({
          name,
          secretKey,
          isUser: true,
        });
      }),
    );

    if (userSecretsConfig !== null) {
      await rm(userSecretsConfig.$getPath());
    }

    const { defaultKeyPairName } = userSecretsConfig ?? {};

    if (defaultKeyPairName === undefined) {
      await writeSecretKey({
        name: AUTO_GENERATED,
        secretKey: await genSecretKeyString(),
        isUser: true,
      });
    }

    return {
      ...config,
      defaultSecretKeyName: defaultKeyPairName ?? AUTO_GENERATED,
    };
  },
} as const satisfies ConfigOptions<PrevConfig, Config>;
