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

import type Reset from "../../commands/dependency/reset.js";
import { commandObj } from "../../lib/commandObj.js";
import { userConfig } from "../../lib/configs/globalConfigs.js";
import {
  GLOBAL_FLAG_NAME,
  fluenceCargoDependencies,
  fluenceNPMDependencies,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export async function resetImpl(
  this: Reset,
  command: typeof Reset,
): Promise<void> {
  const { maybeFluenceConfig, flags } = await initCli(
    this,
    await this.parse(command),
  );

  if (flags.global) {
    const removedDependencies = await removeRecommendedDependencies(
      userConfig.dependencies,
    );

    if (flags.all || removedDependencies === undefined) {
      delete userConfig.dependencies;
    } else {
      userConfig.dependencies = removedDependencies;
    }

    await userConfig.$commit();

    return commandObj.log(
      "successfully reset user's global dependency versions",
    );
  }

  if (maybeFluenceConfig !== null) {
    const removedDependencies = await removeRecommendedDependencies(
      maybeFluenceConfig.dependencies,
    );

    if (flags.all || removedDependencies === undefined) {
      delete maybeFluenceConfig.dependencies;
    } else {
      maybeFluenceConfig.dependencies = removedDependencies;
    }

    await maybeFluenceConfig.$commit();

    return commandObj.log("successfully reset project's dependency versions");
  }

  commandObj.error(
    `Not a fluence project. If you wanted to reset global dependencies, use --${GLOBAL_FLAG_NAME} flag for that`,
  );
}

const removeRecommendedDependencies = async ({
  npm = {},
  cargo = {},
}: {
  npm?: Record<string, string>;
  cargo?: Record<string, string>;
} = {}) => {
  const omit = (await import("lodash-es/omit.js")).default;
  const resetNpmDependencies = omit(npm, fluenceNPMDependencies);
  const resetCargoDependencies = omit(cargo, fluenceCargoDependencies);

  const resetNpmDependenciesOrUndefined =
    Object.keys(resetNpmDependencies).length > 0
      ? resetNpmDependencies
      : undefined;

  const resetCargoDependenciesOrUndefined =
    Object.keys(resetCargoDependencies).length > 0
      ? resetCargoDependencies
      : undefined;

  if (
    resetNpmDependenciesOrUndefined === undefined &&
    resetCargoDependenciesOrUndefined === undefined
  ) {
    return undefined;
  }

  return {
    ...(resetNpmDependenciesOrUndefined === undefined
      ? {}
      : { npm: resetNpmDependenciesOrUndefined }),
    ...(resetCargoDependenciesOrUndefined === undefined
      ? {}
      : { cargo: resetCargoDependenciesOrUndefined }),
  };
};
