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

import type { js2aqua } from "@fluencelabs/js-client";
import { color } from "@oclif/color";
import { Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { validationErrorToString, ajv } from "../lib/ajvInstance.js";
import { commandObj } from "../lib/commandObj.js";
import {
  AQUA_INPUT_PATH_PROPERTY,
  type FluenceConfig,
  type FluenceConfigReadonly,
} from "../lib/configs/project/fluence.js";
import {
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  aquaLogLevelsString,
  isAquaLogLevel,
  AQUA_LOG_LEVELS,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  IMPORT_FLAG,
  type AquaLogLevel,
  type FromFlagsDef,
  TRACING_FLAG,
} from "../lib/const.js";
import { getAquaImports } from "../lib/helpers/aquaImports.js";
import { jsonStringify, splitErrorsAndResults } from "../lib/helpers/utils.js";
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

const FUNC_FLAG_NAME = "func";
const INPUT_FLAG_NAME = "input";
// const ON_FLAG_NAME = "on";
const DATA_FLAG_NAME = "data";
const LOG_LEVEL_COMPILER_FLAG_NAME = "log-level-compiler";

const FUNC_CALL_EXAMPLE = 'funcName("stringArg")';

export default class Run extends BaseCommand<typeof Run> {
  static override description = "Run aqua script";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    data: Flags.string({
      description:
        "JSON in { [argumentName]: argumentValue } format. You can call a function using these argument names like this: -f 'myFunc(argumentName)'. Arguments in this flag override arguments in the --data-path flag",
      helpValue: "<json>",
    }),
    "data-path": Flags.file({
      description:
        "Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function using these argument names like this: -f 'myFunc(argumentName)'. Arguments in this flag can be overridden using --data flag",
      helpValue: "<path>",
    }),
    ...IMPORT_FLAG,
    [LOG_LEVEL_COMPILER_FLAG_NAME]: Flags.string({
      description: `Set log level for the compiler. Must be one of: ${aquaLogLevelsString}`,
      helpValue: "<level>",
    }),
    quiet: Flags.boolean({
      default: false,
      description:
        "Print only execution result. Overrides all --log-level-* flags",
    }),
    const: Flags.string({
      description:
        'Constant that will be used in the aqua code that you run (example of aqua code: SOME_CONST ?= "default_value"). Constant name must be upper cased.',
      helpValue: '<NAME="value">',
      multiple: true,
    }),
    // TODO: DXJ-207
    // [ON_FLAG_NAME]: Flags.string({
    //   description: "PeerId of a peer where you want to run the function",
    //   helpValue: "<peer_id>",
    // }),
    [INPUT_FLAG_NAME]: Flags.string({
      description:
        "Path to an aqua file or to a directory that contains aqua files",
      helpValue: "<path>",
      char: "i",
    }),
    [FUNC_FLAG_NAME]: Flags.string({
      char: "f",
      description: `Function call. Example: ${FUNC_CALL_EXAMPLE}`,
      helpValue: "<function-call>",
    }),
    "no-xor": Flags.boolean({
      default: false,
      description: "Do not generate a wrapper that catches and displays errors",
    }),
    "no-relay": Flags.boolean({
      default: false,
      description: "Do not generate a pass through the relay node",
    }),
    "print-air": Flags.boolean({
      default: false,
      description: "Prints generated AIR code before function execution",
      exclusive: ["print-beautified-air"],
    }),
    "print-beautified-air": Flags.boolean({
      default: false,
      description: "Prints beautified AIR code before function execution",
      char: "b",
      exclusive: ["print-air"],
    }),
    ...OFF_AQUA_LOGS_FLAG,
    ...KEY_PAIR_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...TRACING_FLAG,
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Run),
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

    const runArgs: RunArgs = {
      ...flags,
      filePath: aquaFilePath,
      runData,
      funcCall,
      logLevelCompiler,
      maybeFluenceConfig,
    };

    const result = await fluenceRun(runArgs);

    const stringResult =
      typeof result === "string" ? result : jsonStringify(result);

    // If `--quite` flag is used then commandObj.log does nothing
    // So we use console.log here instead
    // eslint-disable-next-line no-console
    console.log(stringResult);

    await disconnectFluenceClient();

    // performance.mark("whole-end");
    // performance.measure("whole", "whole-start", "whole-end");
  }
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

type RunData = Record<string, Parameters<typeof js2aqua>[0]>;

const runDataSchema: JSONSchemaType<RunData> = {
  type: "object",
  required: [],
};

const validateRunData = ajv.compile(runDataSchema);

const getRunData = async (flags: {
  data: string | undefined;
  "data-path": string | undefined;
}): Promise<RunData | undefined> => {
  let runData: RunData = {};
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

    runData = parsedData;
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

    runData = { ...runData, ...parsedData };
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
  import: undefined | string[];
  logLevelCompiler: AquaLogLevel | undefined;
  runData: RunData | undefined;
};

const fluenceRun = async (args: RunArgs) => {
  const { compileAquaCallFromPath } = await import("@fluencelabs/aqua-api");

  const { functionCall, errors } = await compileAquaCallFromPath({
    funcCall: args.funcCall,
    data: args.runData,
    filePath: args.filePath,
    imports: await getAquaImports({
      aquaImportsFromFlags: args.import,
      maybeFluenceConfig: args.maybeFluenceConfig,
    }),
    constants: formatConstants(args.const),
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

  const { Fluence, callAquaFunction, js2aqua, aqua2js } = await import(
    "@fluencelabs/js-client"
  );

  const schema = functionCall.funcDef;

  // TODO: remove this after DXJ-535 is done
  const argsExpectedFromFuncFlag =
    schema.arrow.domain.tag === "nil" ? {} : schema.arrow.domain.fields;

  const runDataWithSchemas = Object.entries(args.runData ?? {})
    .map(([argName, argValue]) => {
      const argSchema = argsExpectedFromFuncFlag[argName];
      return [argName, argValue, argSchema] as const;
    })
    // if user passes some args that he didn't mention in -f flag - we ignore them
    .filter(
      (
        arg,
      ): arg is [
        (typeof arg)[0],
        (typeof arg)[1],
        NonNullable<(typeof arg)[2]>,
      ] => {
        return arg[2] !== undefined;
      },
    );

  const [missingArgsErrors] = splitErrorsAndResults(
    Object.keys(argsExpectedFromFuncFlag),
    (argNameFromFuncFlag) => {
      const isArgMissing = !runDataWithSchemas.some(
        ([argNameFromDataFlags]) => {
          return argNameFromFuncFlag === argNameFromDataFlags;
        },
      );

      if (isArgMissing) {
        return {
          error: `You are using argument ${color.yellow(
            argNameFromFuncFlag,
          )} in the ${color.yellow(
            args.funcCall,
          )} call, but you didn't pass the value for this argument using ${color.yellow(
            "--data",
          )} or ${color.yellow("--data-path")} flags`,
        };
      }

      return { result: argNameFromFuncFlag };
    },
  );

  if (missingArgsErrors.length > 0) {
    commandObj.error(missingArgsErrors.join("\n"));
  }

  const [runDataErrors, runDataResults] = splitErrorsAndResults(
    runDataWithSchemas,
    ([argName, argValue, argSchema]) => {
      if (argSchema.tag === "arrow") {
        return {
          error: `Argument ${color.yellow(
            argName,
          )} is a function. Currently it can't be passed to ${color.yellow(
            "fluence run",
          )}. We suggest you two wrap this function in your aqua code so there is no need to pass a callback to it`,
        };
      }

      return {
        result: [
          argName,
          js2aqua(argValue, argSchema, { path: [argName] }),
        ] as const,
      };
    },
  );

  if (runDataErrors.length > 0) {
    commandObj.error(runDataErrors.join("\n"));
  }

  await initFluenceClient(args, args.maybeFluenceConfig);

  const { codomain } = functionCall.funcDef.arrow;
  const returnTypeVoid = codomain.tag === "nil" || codomain.items.length === 0;

  const result = await callAquaFunction({
    script: functionCall.script,
    config: {},
    peer: Fluence.getClient(),
    args: Object.fromEntries(runDataResults),
    fireAndForget: returnTypeVoid,
  });

  const returnSchema =
    (schema.arrow.codomain.tag === "unlabeledProduct" &&
    schema.arrow.codomain.items.length === 1
      ? schema.arrow.codomain.items[0]
      : undefined) ?? schema.arrow.codomain;

  return aqua2js(result, returnSchema);
};

function formatConstants(
  constants: string[] | undefined,
): string[] | undefined {
  return (constants ?? []).map((c) => {
    return c
      .split("=")
      .map((s) => {
        return s.trim();
      })
      .join(" = ");
  });
}
