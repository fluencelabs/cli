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

import { resolve } from "node:path";

import type { GatherImportsResult } from "@fluencelabs/npm-aqua-compiler";
import { color } from "@oclif/color";

import {
  resolveAquaConfig,
  compileToFiles,
  type CompileToFilesArgs,
} from "./aqua.js";
import { commandObj } from "./commandObj.js";
import {
  type FluenceConfigReadonly,
  type CompileAqua,
  initFluenceConfig,
} from "./configs/project/fluence.js";
import { COMPILE_AQUA_PROPERTY_NAME } from "./const.js";
import { getAquaImports } from "./helpers/aquaImports.js";
import { stringifyUnknown } from "./helpers/stringifyUnknown.js";
import { commaSepStrToArr, splitErrorsAndResults } from "./helpers/utils.js";
import { projectRootDir } from "./paths.js";
import type { Required } from "./typeHelpers.js";

type CompileAquaFromFluenceConfigArgs = {
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
}: CompileAquaFromFluenceConfigArgs) {
  const fluenceConfig = await initFluenceConfig();

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
            outputPathAbsolute: resolve(projectRootDir, aquaConfig.output),
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

export async function compileAquaFromFluenceConfigWithDefaults(
  aquaImportsFromFlags?: string[],
) {
  await compileAquaFromFluenceConfig({
    imports: await getAquaImports(aquaImportsFromFlags),
  });
}

export function hasAquaToCompile(
  maybeFluenceConfig: FluenceConfigReadonly | null,
): maybeFluenceConfig is FluenceConfigReadonly & {
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
      compileArgs.outputPathAbsolute === undefined || compileArgs.dry
        ? ""
        : ` to ${color.yellow(compileArgs.outputPathAbsolute)}`;

    commandObj.logToStderr(
      `Successfully compiled${aquaConfigName}${from}${to}. If you don't see files or functions you expect to see, make sure you exported things you require from your aqua files`,
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
