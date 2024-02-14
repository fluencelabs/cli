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

import type { GatherImportsResult } from "@fluencelabs/npm-aqua-compiler";
import { color } from "@oclif/color";

import {
  resolveAquaConfig,
  compileToFiles,
  type CompileToFilesArgs,
} from "./aqua.js";
import { commandObj } from "./commandObj.js";
import {
  type FluenceConfig,
  type CompileAqua,
} from "./configs/project/fluence.js";
import { COMPILE_AQUA_PROPERTY_NAME } from "./const.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
  stringifyUnknown,
} from "./helpers/utils.js";
import { exitCli } from "./lifeCycle.js";
import type { Required } from "./typeHelpers.js";

type CompileAquaFromFluenceConfigArgs = {
  fluenceConfig: FluenceConfig;
  imports: GatherImportsResult;
  names?: string | undefined;
  dry?: boolean | undefined;
  watch?: boolean | undefined;
};

export async function compileAquaFromFluenceConfig({
  names: namesFlag,
  imports,
  watch = false,
  dry = false,
  fluenceConfig,
}: CompileAquaFromFluenceConfigArgs) {
  if (!hasAquaToCompile(fluenceConfig)) {
    return;
  }

  const names =
    namesFlag === undefined
      ? Object.keys(fluenceConfig[COMPILE_AQUA_PROPERTY_NAME])
      : commaSepStrToArr(namesFlag);

  const [invalidNames, validNames] = splitErrorsAndResults(names, (name) => {
    if (name in fluenceConfig[COMPILE_AQUA_PROPERTY_NAME]) {
      return {
        result: name,
      };
    }

    return {
      error: name,
    };
  });

  if (invalidNames.length > 0) {
    commandObj.error(
      `${color.yellow(
        invalidNames
          .map((name) => {
            return color.yellow(name);
          })
          .join(", "),
      )} are missing from '${COMPILE_AQUA_PROPERTY_NAME}' property of ${fluenceConfig.$getPath()}`,
    );
  }

  const results = await Promise.allSettled(
    Object.entries(fluenceConfig[COMPILE_AQUA_PROPERTY_NAME])
      .filter(([name]) => {
        return validNames.includes(name);
      })
      .map(async ([name, aquaConfig]) => {
        return compileAquaAndWatch(
          {
            ...resolveAquaConfig(aquaConfig, imports),
            outputPath: aquaConfig.output,
            watch,
            dry,
          },
          name,
        );
      }),
  );

  if (watch) {
    return;
  }

  const compilationErrors = results.filter(
    (res): res is { status: "rejected"; reason: unknown } => {
      return res.status === "rejected";
    },
  );

  if (compilationErrors.length > 0) {
    commandObj.error(
      compilationErrors
        .map((error) => {
          return stringifyUnknown(error.reason);
        })
        .join("\n"),
    );
  }
}

export function hasAquaToCompile(
  maybeFluenceConfig: FluenceConfig | null,
): maybeFluenceConfig is FluenceConfig & {
  [COMPILE_AQUA_PROPERTY_NAME]: CompileAqua;
} {
  return (
    maybeFluenceConfig !== null &&
    COMPILE_AQUA_PROPERTY_NAME in maybeFluenceConfig &&
    Object.keys(maybeFluenceConfig[COMPILE_AQUA_PROPERTY_NAME]).length !== 0
  );
}

export async function compileAquaAndWatch(
  compileArgs: Required<CompileToFilesArgs> & {
    watch: boolean;
  },
  name?: string,
) {
  function compileSuccessLog() {
    const aquaConfigName = name === undefined ? "" : ` ${color.green(name)}`;

    const from = ` from ${color.yellow(compileArgs.filePath)}`;

    const to =
      compileArgs.outputPath === undefined || compileArgs.dry
        ? ""
        : ` to ${color.yellow(compileArgs.outputPath)}`;

    commandObj.logToStderr(
      `Successfully compiled${aquaConfigName}${from}${to}`,
    );
  }

  if (!compileArgs.watch) {
    await compileToFiles(compileArgs);
    compileSuccessLog();
    return;
  }

  function watchingNotification() {
    commandObj.logToStderr(
      `Watching for changes at ${color.yellow(compileArgs.filePath)}...`,
    );
  }

  async function compileWithWatchLog() {
    try {
      await compileToFiles(compileArgs);
      compileSuccessLog();
      watchingNotification();
    } catch (error) {
      commandObj.logToStderr(stringifyUnknown(error));
      watchingNotification();
    }
  }

  await compileWithWatchLog();
  const chokidar = await import("chokidar");

  chokidar
    .watch(compileArgs.filePath, {
      followSymlinks: false,
      usePolling: false,
      interval: 100,
      binaryInterval: 300,
      ignoreInitial: true,
    })
    .on("all", (): void => {
      void compileWithWatchLog();
    });
}
