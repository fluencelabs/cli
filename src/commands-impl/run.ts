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

import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
// import { performance, PerformanceObserver } from "node:perf_hooks";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import type Run from "../commands/run.js";
import { validationErrorToString, ajv } from "../lib/ajvInstance.js";
import { commandObj } from "../lib/commandObj.js";
import {
  AQUA_INPUT_PATH_PROPERTY,
  type FluenceConfig,
  type FluenceConfigReadonly,
} from "../lib/configs/project/fluence.js";
import {
  FS_OPTIONS,
  aquaLogLevelsString,
  isAquaLogLevel,
  AQUA_LOG_LEVELS,
  type AquaLogLevel,
  type FromFlagsDef,
  FUNC_CALL_EXAMPLE,
  FUNC_FLAG_NAME,
  INPUT_FLAG_NAME,
  DATA_FLAG_NAME,
  LOG_LEVEL_COMPILER_FLAG_NAME,
} from "../lib/const.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { jsonStringify } from "../lib/helpers/jsonStringify.js";
import { disconnectFluenceClient, initFluenceClient } from "../lib/jsClient.js";
import { initCli } from "../lib/lifeCycle.js";
import {
  projectRootDir,
  recursivelyFindProjectRootDir,
  setProjectRootDir,
} from "../lib/paths.js";
import { input, list } from "../lib/prompt.js";

// const perfObserver = new PerformanceObserver((items) => {
//   items.getEntries().forEach((entry) => {
//     console.log(entry);
//   });
// });

// perfObserver.observe({ entryTypes: ["measure"], buffered: true });
// performance.mark("whole-start");

export async function runImpl(this: Run, command: typeof Run): Promise<void> {
  const { flags, maybeFluenceConfig } = await initCli(
    this,
    await this.parse(command),
  );

  if (typeof flags.input === "string") {
    setProjectRootDir(
      await recursivelyFindProjectRootDir(resolve(dirname(flags.input))),
    );
  }

  if (flags.quiet) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    commandObj.log = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    commandObj.logToStderr = () => {};
  }

  // if (typeof flags[ON_FLAG_NAME] === "string") {
  //   const onPeerConst = `ON_PEER = "${flags[ON_FLAG_NAME]}"`;

  //   flags.const =
  //     flags.const === undefined
  //       ? [onPeerConst]
  //       : [...flags.const, onPeerConst];
  // }

  const logLevelCompiler = await resolveAquaLogLevel({
    maybeAquaLogLevel: flags["log-level-compiler"],
    isQuite: flags.quiet,
  });

  const aquaFilePath = await ensureAquaPath({
    aquaPathFromFlags: flags.input,
    maybeFluenceConfig,
  });

  const [funcCall, runData] = await Promise.all([
    flags.func === undefined
      ? input({
          message: `Enter a function call that you want to execute. Example: ${color.yellow(
            FUNC_CALL_EXAMPLE,
          )}`,
          flagName: FUNC_FLAG_NAME,
        })
      : Promise.resolve(flags.func),
    getRunData(flags),
  ]);

  const aquaImports = await ensureAquaImports({
    flags,
    maybeFluenceConfig,
  });

  const runArgs: RunArgs = {
    ...flags,
    filePath: aquaFilePath,
    imports: aquaImports,
    runData,
    funcCall,
    logLevelCompiler,
    maybeFluenceConfig,
  };

  const result = await fluenceRun(runArgs);

  const stringResult =
    typeof result === "string" ? result : jsonStringify(result);

  if (stringResult !== undefined) {
    // If `--quite` flag is used then commandObj.log does nothing
    // So we use console.log here instead
    // eslint-disable-next-line no-console
    console.log(stringResult);
  }

  await disconnectFluenceClient();

  // performance.mark("whole-end");
  // performance.measure("whole", "whole-start", "whole-end");
}

type EnsureAquaPathArg = {
  aquaPathFromFlags: string | undefined;
  maybeFluenceConfig: FluenceConfigReadonly | null;
};

const ensureAquaPath = async ({
  aquaPathFromFlags,
  maybeFluenceConfig,
}: EnsureAquaPathArg): Promise<string> => {
  if (typeof aquaPathFromFlags === "string") {
    return aquaPathFromFlags;
  }

  if (typeof maybeFluenceConfig?.aquaInputPath === "string") {
    const aquaInputPath = resolve(
      projectRootDir,
      maybeFluenceConfig.aquaInputPath,
    );

    try {
      await access(aquaInputPath);
      return aquaInputPath;
    } catch {
      commandObj.warn(
        `Invalid ${color.yellow(
          `${AQUA_INPUT_PATH_PROPERTY}: ${aquaInputPath}`,
        )} in ${color.yellow(maybeFluenceConfig.$getPath())}`,
      );
    }
  }

  return input({
    message: "Enter path to the input file or directory",
    flagName: INPUT_FLAG_NAME,
  });
};

type RunData = Record<string, unknown>;

const runDataSchema: JSONSchemaType<RunData> = {
  type: "object",
};

const validateRunData = ajv.compile(runDataSchema);

const getRunData = async (flags: {
  data: string | undefined;
  "data-path": string | undefined;
}): Promise<RunData | undefined> => {
  const runData: RunData = {};
  const { data, "data-path": dataPath } = flags;

  if (typeof dataPath === "string") {
    let data: string;

    try {
      data = await readFile(dataPath, FS_OPTIONS);
    } catch {
      commandObj.error(
        `Can't read ${color.yellow(dataPath)}: No such file or directory`,
      );
    }

    let parsedData: unknown;

    try {
      parsedData = JSON.parse(data);
    } catch {
      commandObj.error(`Unable to parse ${color.yellow(dataPath)}`);
    }

    if (!validateRunData(parsedData)) {
      commandObj.error(
        `Invalid ${color.yellow(dataPath)}: ${await validationErrorToString(
          validateRunData.errors,
        )}`,
      );
    }

    for (const key in parsedData) {
      if (Object.prototype.hasOwnProperty.call(parsedData, key)) {
        runData[key] = parsedData[key];
      }
    }
  }

  if (typeof data === "string") {
    let parsedData: unknown;

    try {
      parsedData = JSON.parse(data);
    } catch {
      commandObj.error(`Unable to parse --${DATA_FLAG_NAME}`);
    }

    if (!validateRunData(parsedData)) {
      commandObj.error(
        `Invalid --${DATA_FLAG_NAME}: ${await validationErrorToString(
          validateRunData.errors,
        )}`,
      );
    }

    for (const key in parsedData) {
      if (Object.prototype.hasOwnProperty.call(parsedData, key)) {
        runData[key] = parsedData[key];
      }
    }
  }

  const dataString = JSON.stringify(runData);
  return dataString === "{}" ? undefined : runData;
};

type ResolveAquaLogLevelArgs = {
  maybeAquaLogLevel: string | undefined;
  isQuite: boolean;
};

const resolveAquaLogLevel = async ({
  maybeAquaLogLevel,
  isQuite,
}: ResolveAquaLogLevelArgs): Promise<AquaLogLevel | undefined> => {
  if (isQuite) {
    return "off";
  }

  if (maybeAquaLogLevel === undefined) {
    return undefined;
  }

  if (isAquaLogLevel(maybeAquaLogLevel)) {
    return maybeAquaLogLevel;
  }

  commandObj.warn(
    `Invalid --${LOG_LEVEL_COMPILER_FLAG_NAME} flag value: ${maybeAquaLogLevel}. Must be one of: ${aquaLogLevelsString}`,
  );

  return list({
    message: "Select a valid compiler log level",
    oneChoiceMessage() {
      throw new Error("Unreachable");
    },
    onNoChoices() {
      throw new Error("Unreachable");
    },
    options: [...AQUA_LOG_LEVELS],
  });
};

type RunArgs = FromFlagsDef<(typeof Run)["flags"]> & {
  maybeFluenceConfig: FluenceConfig | null;
  funcCall: string;
  filePath: string;
  imports: string[];
  logLevelCompiler: AquaLogLevel | undefined;
  runData: RunData | undefined;
};

const fluenceRun = async (args: RunArgs) => {
  const { compileAquaCallFromPath } = await import("@fluencelabs/aqua-api");

  const { functionCall, errors } = await compileAquaCallFromPath({
    funcCall: args.funcCall,
    data: args.runData,
    filePath: args.filePath,
    imports: args.imports,
    constants: args.const ?? [],
    logLevel: args.logLevelCompiler,
    noXor: args["no-xor"],
    noRelay: args["no-relay"],
    tracing: args.tracing,
  });

  if (errors.length > 0) {
    commandObj.error(errors.join("\n"));
  }

  if (args["print-air"]) {
    commandObj.log(functionCall.script);
  } else if (args["print-beautified-air"]) {
    const { beautify } = await import("@fluencelabs/air-beautify-wasm");
    commandObj.log(beautify(functionCall.script));
  }

  await initFluenceClient(args, args.maybeFluenceConfig);
  const { Fluence, callAquaFunction } = await import("@fluencelabs/js-client");

  const result = await callAquaFunction({
    args: args.runData ?? {},
    config: {},
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    def: functionCall.funcDef,
    peer: await Fluence.getClient(),
    script: functionCall.script,
  });

  return result;
};
