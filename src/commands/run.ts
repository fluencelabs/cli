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

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
// import { performance, PerformanceObserver } from "node:perf_hooks";

import type { CompileFuncCallFromPathArgs } from "@fluencelabs/aqua-api";
import type { js2aqua } from "@fluencelabs/js-client";
import { color } from "@oclif/color";
import { Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { validationErrorToString, ajv } from "../lib/ajvInstance.js";
import {
  resolveAquaConfig,
  compileFunctionCall,
  resolveCommonAquaCompilationFlags,
} from "../lib/aqua.js";
import type { ResolvedCommonAquaCompilationFlags } from "../lib/aqua.js";
import { commandObj } from "../lib/commandObj.js";
import {
  type FluenceConfig,
  type FluenceConfigReadonly,
} from "../lib/configs/project/fluence.js";
import {
  COMPILE_AQUA_PROPERTY_NAME,
  INPUT_FLAG_NAME,
  FS_OPTIONS,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  COMMON_AQUA_COMPILATION_FLAGS,
  type FluenceClientFlags,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  INPUT_FLAG_EXPLANATION,
} from "../lib/const.js";
import { jsonStringify, splitErrorsAndResults } from "../lib/helpers/utils.js";
import { disconnectFluenceClient, initFluenceClient } from "../lib/jsClient.js";
import { initCli } from "../lib/lifeCycle.js";
import { projectRootDir } from "../lib/paths.js";
import { input } from "../lib/prompt.js";

// const perfObserver = new PerformanceObserver((items) => {
//   items.getEntries().forEach((entry) => {
//     console.log(entry);
//   });
// });

// perfObserver.observe({ entryTypes: ["measure"], buffered: true });
// performance.mark("whole-start");

const FUNC_FLAG_NAME = "func";
const FUNC_SHORT_FLAG_NAME = "f";
// const ON_FLAG_NAME = "on";
const DATA_FLAG_NAME = "data";
const FUNC_CALL_EXAMPLE = 'funcName("stringArg")';

export default class Run extends BaseCommand<typeof Run> {
  static override description = `Run the first aqua function CLI is able to find and compile among all aqua files specified in '${COMPILE_AQUA_PROPERTY_NAME}' property of ${FLUENCE_CONFIG_FULL_FILE_NAME} file${INPUT_FLAG_EXPLANATION}`;
  static override examples = [
    `<%= config.bin %> <%= command.id %> -${FUNC_SHORT_FLAG_NAME} '${FUNC_CALL_EXAMPLE}'`,
  ];
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
    quiet: Flags.boolean({
      default: false,
      description:
        "Print only execution result. Overrides all --log-level-* flags",
    }),
    // TODO: DXJ-207
    // [ON_FLAG_NAME]: Flags.string({
    //   description: "PeerId of a peer where you want to run the function",
    //   helpValue: "<peer_id>",
    // }),
    [FUNC_FLAG_NAME]: Flags.string({
      char: FUNC_SHORT_FLAG_NAME,
      description: `Function call. Example: ${FUNC_CALL_EXAMPLE}`,
      helpValue: "<function-call>",
    }),
    "print-air": Flags.boolean({
      default: false,
      description: "Prints generated AIR code instead of function execution",
      exclusive: ["print-beautified-air"],
    }),
    "print-beautified-air": Flags.boolean({
      default: false,
      description: "Prints beautified AIR code instead of function execution",
      char: "b",
      exclusive: ["print-air"],
    }),
    ...OFF_AQUA_LOGS_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...COMMON_AQUA_COMPILATION_FLAGS,
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig: fluenceConfig } = await initCli(
      this,
      await this.parse(Run),
    );

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

    const compileFuncCallArgs = await ensureCompileFuncCallArgs({
      aquaPathFromFlags: flags.input,
      fluenceConfig,
      aquaCompilationFlags: await resolveCommonAquaCompilationFlags(
        flags,
        fluenceConfig,
      ),
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

    const result = await fluenceRun({
      ...flags,
      compileFuncCallArgs,
      runData,
      funcCall,
      fluenceConfig,
    });

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
  fluenceConfig: FluenceConfigReadonly | null;
  aquaCompilationFlags: ResolvedCommonAquaCompilationFlags;
};

async function ensureCompileFuncCallArgs({
  aquaPathFromFlags,
  fluenceConfig,
  aquaCompilationFlags,
}: EnsureAquaPathArg): Promise<
  Omit<CompileFuncCallFromPathArgs, "funcCall">[]
> {
  if (typeof aquaPathFromFlags === "string") {
    return [{ ...aquaCompilationFlags, filePath: resolve(aquaPathFromFlags) }];
  }

  const { compileAqua } = fluenceConfig ?? {};

  if (compileAqua !== undefined) {
    return Object.values(compileAqua).map((config) => {
      const resolvedAquaConfig = resolveAquaConfig(
        config,
        aquaCompilationFlags.imports,
      );

      return {
        ...resolvedAquaConfig,
        filePath: resolve(projectRootDir, resolvedAquaConfig.filePath),
      };
    });
  }

  return [
    {
      ...aquaCompilationFlags,
      filePath: resolve(
        await input({
          message: "Enter path to the input file",
          flagName: INPUT_FLAG_NAME,
        }),
      ),
    },
  ];
}

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

type RunArgs = {
  fluenceConfig: FluenceConfig | null;
  compileFuncCallArgs: Omit<CompileFuncCallFromPathArgs, "funcCall">[];
  funcCall: string;
  runData: RunData | undefined;
  "print-air": boolean;
  "print-beautified-air": boolean;
} & FluenceClientFlags;

async function fluenceRun(args: RunArgs) {
  const compilationResults = await Promise.all(
    args.compileFuncCallArgs.map((compileFunctionCallArgs) => {
      return compileFunctionCall({
        ...compileFunctionCallArgs,
        data: args.runData,
        funcCall: args.funcCall,
      });
    }),
  );

  const [firstSuccessfulCompilationResult] = compilationResults.flatMap(
    ([, successfulCompilationResults]) => {
      return successfulCompilationResults;
    },
  );

  if (firstSuccessfulCompilationResult === undefined) {
    const functionNotFoundPaths: string[] = [];

    const errors = compilationResults
      .flatMap(([err]) => {
        return err;
      })
      // extract function not found errors
      .map(({ aquaFilePath, compilationResult }) => {
        const [functionNotFound, restErrors] = splitErrorsAndResults(
          compilationResult.errors,
          (error) => {
            if (
              error.startsWith("There is no function") &&
              error.includes("or it is not exported")
            ) {
              return { error: aquaFilePath };
            }

            return { result: error };
          },
        );

        functionNotFoundPaths.push(...functionNotFound);

        return {
          aquaFilePath,
          errors: restErrors,
        };
      })
      .filter(({ errors }) => {
        return errors.length !== 0;
      })
      .map(({ aquaFilePath, errors }) => {
        return `${color.yellow(aquaFilePath)}\n\n${errors.join("\n")}`;
      });

    const functionName = args.funcCall.split("(")[0];

    const functionNotFoundErrorText =
      functionNotFoundPaths.length === 0
        ? ""
        : `\n\nChecked the following files and function ${color.yellow(
            functionName,
          )} is not exported from them:\n\n${color.yellow(
            functionNotFoundPaths.join("\n"),
          )}`;

    const restErrorsText =
      errors.length === 0
        ? ""
        : `\n\nFound some errors when trying to compile:\n\n${color.yellow(
            errors.join("\n\n"),
          )}`;

    commandObj.error(
      `Can't find function ${color.yellow(
        functionName,
      )}${functionNotFoundErrorText}${restErrorsText}`,
    );
  }

  const functionCall =
    firstSuccessfulCompilationResult.compilationResult.functionCall;

  if (args["print-air"]) {
    commandObj.log(functionCall.script);
    return;
  }

  if (args["print-beautified-air"]) {
    const { beautify } = await import("@fluencelabs/air-beautify-wasm");
    commandObj.log(beautify(functionCall.script));
    return;
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

  await initFluenceClient(args, args.fluenceConfig);

  const { codomain } = functionCall.funcDef.arrow;
  const returnTypeVoid = codomain.tag === "nil" || codomain.items.length === 0;

  commandObj.logToStderr(
    `Running ${color.yellow(args.funcCall)} from ${color.yellow(
      firstSuccessfulCompilationResult.aquaFilePath,
    )}\n`,
  );

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

  return aqua2js(result, returnSchema, {
    path: [`${functionCall.funcDef.functionName}ReturnValue`],
  });
}
