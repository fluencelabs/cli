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

import { access, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
// import { performance, PerformanceObserver } from "node:perf_hooks";

import {
  Fluence,
  FnConfig,
  callAquaFunction,
} from "@fluencelabs/js-client.api";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { ajv } from "../lib/ajvInstance.js";
import { compile } from "../lib/aqua.js";
import { initAquaCli } from "../lib/aquaCli.js";
import { commandObj } from "../lib/commandObj.js";
import {
  AppConfigReadonly,
  initReadonlyAppConfig,
} from "../lib/configs/project/app.js";
import {
  AQUA_INPUT_PATH_PROPERTY,
  FluenceConfig,
  FluenceConfigReadonly,
} from "../lib/configs/project/fluence.js";
import {
  FS_OPTIONS,
  KEY_PAIR_FLAG,
  FLUENCE_CONFIG_FILE_NAME,
  aquaLogLevelsString,
  isAquaLogLevel,
  AquaLogLevel,
  AQUA_LOG_LEVELS,
  OFF_AQUA_LOGS_FLAG,
  FLUENCE_CLIENT_FLAGS,
  FromFlagsDef,
  IMPORT_FLAG,
} from "../lib/const.js";
import { getAppJson } from "../lib/deployedApp.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { jsonStringify } from "../lib/helpers/jsonStringify.js";
import { initFluenceClient } from "../lib/jsClient.js";
import { getExistingKeyPair } from "../lib/keyPairs.js";
import { initCli } from "../lib/lifeCycle.js";
import { getRandomRelayAddr } from "../lib/multiaddres.js";
import {
  ensureFluenceTmpAppServiceJsonPath,
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

export default class Run extends BaseCommand<typeof Run> {
  static override description = "Run aqua script";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    data: Flags.string({
      description:
        "JSON in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<json>",
    }),
    "data-path": Flags.file({
      description:
        "Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<path>",
    }),
    ...IMPORT_FLAG,
    [LOG_LEVEL_COMPILER_FLAG_NAME]: Flags.string({
      description: `Set log level for the compiler. Must be one of: ${aquaLogLevelsString}`,
      helpValue: "<level>",
    }),
    quiet: Flags.boolean({
      description:
        "Print only execution result. Overrides all --log-level-* flags",
    }),
    plugin: Flags.string({
      description:
        "[experimental] Path to a directory with JS plugins (Read more: https://fluence.dev/docs/aqua-book/aqua-cli/plugins)",
      helpValue: "<path>",
    }),
    const: Flags.string({
      description:
        'Constant that will be used in the aqua code that you run (example of aqua code: SOME_CONST ?= "default_value"). Constant name must be upper cased.',
      helpValue: "<NAME = value>",
      multiple: true,
    }),
    "json-service": Flags.string({
      description: "Path to a file that contains a JSON formatted service",
      helpValue: "<path>",
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
      description: "Function call",
      helpValue: "<function-call>",
    }),
    "no-xor": Flags.boolean({
      description: "Do not generate a wrapper that catches and displays errors",
    }),
    "no-relay": Flags.boolean({
      description: "Do not generate a pass through the relay node",
    }),
    "print-air": Flags.boolean({
      description: "Prints generated AIR code before function execution",
    }),
    ...OFF_AQUA_LOGS_FLAG,
    ...KEY_PAIR_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Run)
    );

    if (typeof flags.input === "string") {
      setProjectRootDir(
        await recursivelyFindProjectRootDir(resolve(dirname(flags.input)))
      );
    }

    if (flags.quiet) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      commandObj.log = () => {};
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

    const [funcCall, maybeAppConfig, runData, appJsonServicePath] =
      await Promise.all([
        flags.func === undefined
          ? input({
              message: `Enter a function call that you want to execute`,
              flagName: FUNC_FLAG_NAME,
            })
          : Promise.resolve(flags.func),
        initReadonlyAppConfig(),
        getRunData(flags),
        ensureFluenceTmpAppServiceJsonPath(),
      ]);

    const jsonServicePaths = flags["json-service"] ?? [];

    if (maybeAppConfig !== null) {
      await writeFile(
        appJsonServicePath,
        getAppJson(maybeAppConfig.services),
        FS_OPTIONS
      );

      jsonServicePaths.push(appJsonServicePath);
    }

    const aquaImports = await ensureAquaImports({
      flags,
      maybeFluenceConfig,
    });

    const runArgs: RunArgs = {
      ...flags,
      appJsonServicePath,
      filePath: aquaFilePath,
      imports: aquaImports,
      runData,
      funcCall,
      jsonServicePaths,
      logLevelCompiler,
      maybeAppConfig,
      maybeFluenceConfig,
    };

    /**
     * Whether to use `aqua run` or not.
     * Is currently set to true for all cases because of the bug related to the new fluence js client
     */
    const useAquaRun =
      false || typeof flags.plugin === "string" || jsonServicePaths.length > 0;

    const result: unknown = await (useAquaRun
      ? aquaRun(runArgs)
      : fluenceRun(runArgs));

    const stringResult =
      typeof result === "string" ? result : jsonStringify(result);

    if (!useAquaRun) {
      console.log(stringResult);
    }

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
      maybeFluenceConfig.aquaInputPath
    );

    try {
      await access(aquaInputPath);
      return aquaInputPath;
    } catch {
      commandObj.warn(
        `Invalid ${color.yellow(AQUA_INPUT_PATH_PROPERTY)} in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}: ${aquaInputPath}`
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
}): Promise<FnConfig | undefined> => {
  const runData: RunData = {};
  const { data, "data-path": dataPath } = flags;

  if (typeof dataPath === "string") {
    let data: string;

    try {
      data = await readFile(dataPath, FS_OPTIONS);
    } catch {
      commandObj.error(
        `Can't read ${color.yellow(dataPath)}: No such file or directory`
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
        `Invalid ${color.yellow(dataPath)}: ${JSON.stringify(
          validateRunData.errors
        )}`
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
        `Invalid --${DATA_FLAG_NAME}: ${JSON.stringify(validateRunData.errors)}`
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
    `Invalid --${LOG_LEVEL_COMPILER_FLAG_NAME} flag value: ${maybeAquaLogLevel}. Must be one of: ${aquaLogLevelsString}`
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
  maybeAppConfig: AppConfigReadonly | null;
  funcCall: string;
  filePath: string;
  imports: string[];
  jsonServicePaths: string[];
  logLevelCompiler: AquaLogLevel | undefined;
  runData: FnConfig | undefined;
  appJsonServicePath: string;
};

const aquaRun = async (args: RunArgs) => {
  commandObj.log("using aqua cli run command");
  const aquaCli = await initAquaCli(args.maybeFluenceConfig);
  const keyPair = await getExistingKeyPair(args["key-pair-name"]);

  const relay =
    args.relay ??
    getRandomRelayAddr(
      args.maybeAppConfig?.relays ?? args.maybeFluenceConfig?.relays
    );

  let result;

  try {
    result = await aquaCli({
      args: ["run"],
      flags: {
        addr: relay,
        func: args.funcCall,
        input: args.filePath,
        timeout: args["dial-timeout"],
        import: args.imports,
        "json-service": args.jsonServicePaths,
        sk: keyPair.secretKey,
        plugin: args.plugin,
        const: args.const ?? [],
        "print-air": args["print-air"],
        ...(args.runData === undefined
          ? {}
          : { data: JSON.stringify(args.runData) }),
        "log-level": args.logLevelCompiler,
        "no-xor": args["no-xor"],
        "no-relay": args["no-relay"],
      },
    });
  } finally {
    if (args.maybeAppConfig !== null) {
      await unlink(args.appJsonServicePath);
    }
  }

  return result;
};

const fluenceRun = async (args: RunArgs) => {
  const [{ functionCall, errors }] = await Promise.all([
    compile({
      funcCall: args.funcCall,
      data: args.runData,
      filePath: args.filePath,
      imports: args.imports,
      constants: args.const ?? [],
      logLevel: args.logLevelCompiler,
      noXor: args["no-xor"],
      noRelay: args["no-relay"],
    }),
    initFluenceClient(args, args.maybeFluenceConfig),
  ]);

  if (errors.length > 0) {
    commandObj.error(errors.join("\n"));
  }

  if (args["print-air"]) {
    commandObj.log(functionCall.script);
  }

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
