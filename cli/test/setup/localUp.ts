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

import { initProviderConfigWithPath } from "../../src/lib/configs/project/provider.js";
import { numToStr } from "../../src/lib/helpers/typesafeStringify.js";
import { fluence } from "../helpers/commonWithSetupTests.js";
import { fluenceEnv, CC_DURATION_SECONDS } from "../helpers/constants.js";
import { pathToTheTemplateWhereLocalEnvironmentIsSpunUp } from "../helpers/paths.js";

if (fluenceEnv === "local") {
  const providerConfig = await initProviderConfigWithPath(
    pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  );

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

  await providerConfig.$commit();

  await fluence({
    args: ["local", "up"],
    flags: { r: true },
    cwd: pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
    timeout: 1000 * 60 * 8, // 8 minutes
  });
}
