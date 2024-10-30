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

import assert from "node:assert";
import { join } from "node:path";

import { describe } from "vitest";

import { LOCAL_NET_DEFAULT_ACCOUNTS } from "../../src/common.js";
import { getConfigInitFunction } from "../../src/lib/configs/initConfigNew.js";
import { options as providerConfigOptions } from "../../src/lib/configs/project/provider/provider.js";
import {
  OFFER_FLAG_NAME,
  PRIV_KEY_FLAG_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../src/lib/const.js";
import { numToStr } from "../../src/lib/helpers/typesafeStringify.js";
import { stringifyUnknown } from "../../src/lib/helpers/utils.js";
import { fluence } from "../helpers/commonWithSetupTests.js";
import { CC_DURATION_SECONDS } from "../helpers/constants.js";
import { initializeTemplate } from "../helpers/sharedSteps.js";
import { sleepSeconds, wrappedTest } from "../helpers/utils.js";

const PRIV_KEY_1 = {
  [PRIV_KEY_FLAG_NAME]: LOCAL_NET_DEFAULT_ACCOUNTS[1].privateKey,
};

async function initProviderConfigWithPath(path: string) {
  return getConfigInitFunction({
    ...providerConfigOptions,
    getConfigPath() {
      return join(path, PROVIDER_CONFIG_FULL_FILE_NAME);
    },
  })();
}

describe("provider tests", () => {
  wrappedTest(
    "should be able to register and update provider with a new name",
    async () => {
      const cwd = join("test", "tmp", "fullLifeCycle");
      await initializeTemplate(cwd, "quickstart");

      const providerConfig = await initProviderConfigWithPath(cwd);

      assert(
        providerConfig !== null,
        "Provider config must already exists in a quickstart template",
      );

      // add extra capacity commitments and compute peers not used in any offer
      providerConfig.capacityCommitments = Object.fromEntries(
        Object.values(providerConfig.capacityCommitments).map((config, i) => {
          return [
            `nox-${numToStr(i)}`,
            { ...config, duration: `${numToStr(CC_DURATION_SECONDS)} seconds` },
          ] as const;
        }),
      );

      const NEW_OFFER_NAME = "newOffer";
      const [defaultOffer] = Object.values(providerConfig.offers);

      assert(
        defaultOffer !== undefined,
        "Default offer must exist in the provider config",
      );

      providerConfig.offers = { [NEW_OFFER_NAME]: defaultOffer };
      const PROVIDER_NAME = "AwesomeProvider";
      providerConfig.providerName = PROVIDER_NAME;
      await providerConfig.$commit();

      const TEST_DEFAULT = {
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      } as const;

      await fluence({
        args: ["provider", "tokens-distribute"],
        flags: {
          ...TEST_DEFAULT.flags,
          amount: "10",
        },
        cwd,
      });

      await fluence({ args: ["provider", "register"], flags: PRIV_KEY_1, cwd });
      await checkProviderNameIsCorrect(cwd, PROVIDER_NAME);
      const NEW_PROVIDER_NAME = "NewAwesomeProvider";
      providerConfig.providerName = NEW_PROVIDER_NAME;
      await providerConfig.$commit();
      await fluence({ args: ["provider", "update"], flags: PRIV_KEY_1, cwd });
      await checkProviderNameIsCorrect(cwd, NEW_PROVIDER_NAME);

      await fluence({
        args: ["provider", "offer-create"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-create"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-activate"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await sleepSeconds(5);

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await sleepSeconds(CC_DURATION_SECONDS);

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-finish"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "offer-remove"],
        ...TEST_DEFAULT,
      });

      // SET UP FOR THE REST OF THE TESTS

      providerConfig.capacityCommitments = Object.fromEntries(
        Object.values(providerConfig.capacityCommitments).map((config, i) => {
          return [
            `nox-${numToStr(i)}`,
            { ...config, duration: `8 hours` },
          ] as const;
        }),
      );

      await providerConfig.$commit();
      await fluence({ args: ["provider", "register"], cwd });

      await fluence({
        args: ["provider", "offer-create"],
        flags: {
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      await fluence({
        args: ["provider", "cc-create"],
        flags: {
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      await fluence({
        args: ["provider", "cc-activate"],
        flags: {
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });
    },
  );
});

async function checkProviderNameIsCorrect(cwd: string, providerName: string) {
  try {
    await fluence({ args: ["provider", "register"], flags: PRIV_KEY_1, cwd });
    new Error("Provider din't throw error when trying to register it twice");
  } catch (e) {
    const stringifiedError = stringifyUnknown(e);

    assert(
      stringifiedError.includes(providerName),
      `CLI error message must contain current actual provider name: ${providerName}. Got: ${stringifiedError}`,
    );
  }
}
