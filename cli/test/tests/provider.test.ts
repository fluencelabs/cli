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
import { initProviderConfigWithPath } from "../../src/lib/configs/project/provider.js";
import { DEFAULT_NUMBER_OF_LOCAL_NET_NOXES } from "../../src/lib/const";
import { OFFER_FLAG_NAME, PRIV_KEY_FLAG_NAME } from "../../src/lib/const.js";
import { numToStr } from "../../src/lib/helpers/typesafeStringify.js";
import { stringifyUnknown } from "../../src/lib/helpers/utils.js";
import { fluence } from "../helpers/commonWithSetupTests.js";
import { CC_DURATION_MINUTES } from "../helpers/constants.js";
import { initializeTemplate } from "../helpers/sharedSteps.js";
import { sleepSeconds, wrappedTest } from "../helpers/utils.js";

const PRIV_KEY_1 = {
  [PRIV_KEY_FLAG_NAME]: LOCAL_NET_DEFAULT_ACCOUNTS[1].privateKey,
};

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

      const NEW_OFFER_NAME = "newOffer";
      const [defaultOffer] = Object.values(providerConfig.offers);

      assert(
        defaultOffer !== undefined,
        "Default offer must exist in the provider config",
      );

      providerConfig.offers = {
        ...providerConfig.offers,
        // add offer with remaining compute peers
        [NEW_OFFER_NAME]: {
          ...defaultOffer,
          computePeers: defaultOffer.computePeers.map((_cp, i, ar) => {
            return `nox-${numToStr(i + ar.length)}`;
          }),
        },
      };

      const PROVIDER_NAME = "AwesomeProvider";
      providerConfig.providerName = PROVIDER_NAME;
      await providerConfig.$commit();

      await fluence({
        args: ["provider", "tokens-distribute"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
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
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      await fluence({
        args: ["provider", "cc-create"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      const ccInfoRes1 = await fluence({
        args: ["provider", "cc-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      assert(
        (ccInfoRes1.match(/Status: WaitDelegation/g) ?? []).length ===
          DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
        `CC status must be WaitDelegation`,
      );

      await fluence({
        args: ["provider", "cc-activate"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      const ccInfoRes2 = await fluence({
        args: ["provider", "cc-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      assert(
        (ccInfoRes2.match(/Status: WaitStart/g) ?? []).length ===
          DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
        `CC status must be WaitStart`,
      );

      await sleepSeconds(CC_DURATION_MINUTES * 60);

      const ccInfoRes3 = await fluence({
        args: ["provider", "cc-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      assert(
        (ccInfoRes3.match(/Status: Active/g) ?? []).length ===
          DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
        `CC status must be Active`,
      );

      await sleepSeconds(CC_DURATION_MINUTES * 60);

      const ccInfoRes4 = await fluence({
        args: ["provider", "cc-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      assert(
        (ccInfoRes4.match(/Status: Inactive/g) ?? []).length ===
          DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
        `CC status must be Inactive`,
      );

      await fluence({
        args: ["provider", "cc-collateral-withdraw"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      const ccInfoRes5 = await fluence({
        args: ["provider", "cc-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      });

      assert(
        (ccInfoRes5.match(/Status: Removed/g) ?? []).length ===
          DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
        `CC status must be Removed`,
      );
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
