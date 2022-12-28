/**
 * Copyright 2022 Fluence Labs Limited
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
import { resolve } from "node:path";

import { AvmLoglevel, FluencePeer, KeyPair } from "@fluencelabs/fluence";
import { callFunctionImpl } from "@fluencelabs/fluence/dist/internal/compilerSupport/v3impl/callFunction";
import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { ajv } from "../lib/ajv";
import { compile, Data } from "../lib/aqua";
import { initAquaCli } from "../lib/aquaCli";
import {
  AppConfigReadonly,
  initReadonlyAppConfig,
} from "../lib/configs/project/app";
import {
  AQUA_INPUT_PATH_PROPERTY,
  FluenceConfig,
  FluenceConfigReadonly,
  initFluenceConfig,
} from "../lib/configs/project/fluence";
import {
  defaultFluenceLockConfig,
  FluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../lib/configs/project/fluenceLock";
import {
  CommandObj,
  FS_OPTIONS,
  NO_INPUT_FLAG,
  TIMEOUT_FLAG,
  KEY_PAIR_FLAG,
  FLUENCE_CONFIG_FILE_NAME,
  aquaLogLevelsString,
  avmLogLevelsString,
  isAvmLogLevel,
  AVM_LOG_LEVELS,
  isAquaLogLevel,
  AquaLogLevel,
  AQUA_LOG_LEVELS,
} from "../lib/const";
import { getAppJson } from "../lib/deployedApp";
import { ensureAquaImports } from "../lib/helpers/aquaImports";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { getExistingKeyPairFromFlags } from "../lib/keypairs";
import { getRandomRelayAddr } from "../lib/multiaddr";
import {
  ensureFluenceTmpAppServiceJsonPath,
  projectRootDirPromise,
} from "../lib/paths";
import { input, list } from "../lib/prompt";

const FUNC_FLAG_NAME = "func";
const INPUT_FLAG_NAME = "input";
const ON_FLAG_NAME = "on";
const DATA_FLAG_NAME = "data";
const JSON_SERVICE = "json-service";
const LOG_LEVEL_COMPILER_FLAG_NAME = "log-level-compiler";
const LOG_LEVEL_AVM_FLAG_NAME = "log-level-avm";

export default class Run extends Command {
  static override description = "Run aqua script";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    relay: Flags.string({
      description: "Relay node multiaddr",
      helpValue: "<multiaddr>",
    }),
    [DATA_FLAG_NAME]: Flags.string({
      description:
        "JSON in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<json>",
    }),
    "data-path": Flags.file({
      description:
        "Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<path>",
    }),
    import: Flags.string({
      description:
        "Path to a directory to import from. May be used several times",
      helpValue: "<path>",
      multiple: true,
    }),
    [LOG_LEVEL_COMPILER_FLAG_NAME]: Flags.string({
      description: `Set log level for the compiler. Must be one of: ${aquaLogLevelsString}`,
      helpValue: "<level>",
    }),
    [LOG_LEVEL_AVM_FLAG_NAME]: Flags.string({
      description: `Set log level for AquaVM. Must be one of: ${avmLogLevelsString}`,
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
    [JSON_SERVICE]: Flags.string({
      description: "Path to a file that contains a JSON formatted service",
      helpValue: "<path>",
      multiple: true,
    }),
    [ON_FLAG_NAME]: Flags.string({
      description: "PeerId of a peer where you want to run the function",
      helpValue: "<peer_id>",
    }),
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
    ...TIMEOUT_FLAG,
    ...NO_INPUT_FLAG,
    ...KEY_PAIR_FLAG,
  };
  async run(): Promise<void | string> {
    const { flags } = await this.parse(Run);
    const isInteractive = getIsInteractive(flags);
    const maybeFluenceConfig = await initFluenceConfig(this);

    const logLevelAVM: AvmLoglevel | undefined = await resolveAVMLogLevel({
      commandObj: this,
      isInteractive,
      maybeAVMLogLevel: flags["log-level-avm"],
      isQuite: flags.quiet,
    });

    const logLevelCompiler: AquaLogLevel | undefined =
      await resolveAquaLogLevel({
        commandObj: this,
        isInteractive,
        maybeAquaLogLevel: flags["log-level-avm"],
        isQuite: flags.quiet,
      });

    if (flags.quiet) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.log = () => {};
    }

    if (typeof flags[ON_FLAG_NAME] === "string") {
      const onPeerConst = `ON_PEER = "${flags[ON_FLAG_NAME]}"`;

      flags.const =
        flags.const === undefined
          ? [onPeerConst]
          : [...flags.const, onPeerConst];
    }

    const {
      const: consts = [],
      "no-relay": noRelay,
      "no-xor": noXor,
      "print-air": printAir,
      plugin,
      timeout,
      on,
    } = flags;

    const keyPair = await getExistingKeyPairFromFlags(
      flags,
      this,
      isInteractive
    );

    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }

    const secretKey = keyPair.secretKey;

    const aquaFilePath = await ensureAquaPath({
      aquaPathFromFlags: flags[INPUT_FLAG_NAME],
      isInteractive,
      maybeFluenceConfig,
      commandObj: this,
    });

    const funcCallStr =
      flags[FUNC_FLAG_NAME] ??
      (await input({
        message: `Enter a function call that you want to execute`,
        isInteractive,
        flagName: FUNC_FLAG_NAME,
      }));

    const maybeAppConfig = await initReadonlyAppConfig(this);

    const relay =
      flags.relay ??
      getRandomRelayAddr(maybeAppConfig?.relays ?? maybeFluenceConfig?.relays);

    const [data, appJsonServicePath, maybeFluenceLockConfig] =
      await Promise.all([
        getRunData(flags, this),
        ensureFluenceTmpAppServiceJsonPath(),
        initFluenceLockConfig(this),
      ]);

    const jsonServicePaths = flags[JSON_SERVICE] ?? [];

    if (maybeAppConfig !== null) {
      await writeFile(
        appJsonServicePath,
        getAppJson(maybeAppConfig.services),
        FS_OPTIONS
      );

      jsonServicePaths.push(appJsonServicePath);
    }

    const aquaImports =
      maybeFluenceConfig === null
        ? await ensureAquaImports({
            commandObj: this,
            flags,
            maybeFluenceConfig,
            maybeFluenceLockConfig: null,
          })
        : await ensureAquaImports({
            commandObj: this,
            flags,
            maybeFluenceConfig,
            maybeFluenceLockConfig:
              maybeFluenceLockConfig ??
              (await initNewFluenceLockConfig(defaultFluenceLockConfig, this)),
          });

    const runArgs: RunArgs = {
      commandObj: this,
      appJsonServicePath,
      aquaFilePath,
      aquaImports,
      consts,
      data,
      funcCallStr,
      jsonServicePaths,
      logLevelAVM,
      logLevelCompiler,
      maybeAppConfig,
      maybeFluenceConfig,
      maybeFluenceLockConfig,
      noRelay,
      noXor,
      plugin,
      printAir,
      relay,
      secretKey,
      timeout,
      on,
    };

    const useAquaRun =
      typeof flags.plugin === "string" ||
      jsonServicePaths.length > 0 ||
      consts.length > 0 ||
      noXor ||
      noRelay;

    const result: unknown = await (useAquaRun
      ? aquaRun(runArgs)
      : fluenceRun(runArgs));

    const stringResult = String(result);

    if (flags.quiet) {
      console.log(stringResult);
      return;
    }

    this.log(`\n${color.yellow("Result:")}\n\n${stringResult}`);
  }
}

type EnsureAquaPathArg = {
  aquaPathFromFlags: string | undefined;
  maybeFluenceConfig: FluenceConfigReadonly | null;
  isInteractive: boolean;
  commandObj: CommandObj;
};

const ensureAquaPath = async ({
  aquaPathFromFlags,
  maybeFluenceConfig,
  isInteractive,
  commandObj,
}: EnsureAquaPathArg): Promise<string> => {
  if (typeof aquaPathFromFlags === "string") {
    return aquaPathFromFlags;
  }

  if (typeof maybeFluenceConfig?.aquaInputPath === "string") {
    const aquaInputPath = resolve(
      await projectRootDirPromise,
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
    isInteractive,
    message: "Enter path to the input file or directory",
    flagName: "input",
  });
};

type RunData = Record<string, unknown>;

const runDataSchema: JSONSchemaType<RunData> = {
  type: "object",
};

const validateRunData = ajv.compile(runDataSchema);

const getRunData = async (
  flags: { data: string | undefined; "data-path": string | undefined },
  commandObj: CommandObj
): Promise<Data | undefined> => {
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

type ResolveAVMLogLevelArgs = {
  commandObj: CommandObj;
  maybeAVMLogLevel: string | undefined;
  isInteractive: boolean;
  isQuite: boolean;
};

const resolveAVMLogLevel = async ({
  maybeAVMLogLevel,
  commandObj,
  isInteractive,
  isQuite,
}: ResolveAVMLogLevelArgs): Promise<AvmLoglevel | undefined> => {
  if (isQuite) {
    return "off";
  }

  if (maybeAVMLogLevel === undefined) {
    return undefined;
  }

  if (isAvmLogLevel(maybeAVMLogLevel)) {
    return maybeAVMLogLevel;
  }

  commandObj.warn(
    `Invalid --${LOG_LEVEL_AVM_FLAG_NAME} flag value: ${maybeAVMLogLevel}. Must be one of: ${avmLogLevelsString}`
  );

  return list({
    isInteractive,
    message: "Select a valid AVM log level",
    oneChoiceMessage() {
      return commandObj.error("Unreachable");
    },
    onNoChoices() {
      return commandObj.error("Unreachable");
    },
    options: AVM_LOG_LEVELS,
  });
};

type ResolveAquaLogLevelArgs = {
  commandObj: CommandObj;
  maybeAquaLogLevel: string | undefined;
  isInteractive: boolean;
  isQuite: boolean;
};

const resolveAquaLogLevel = async ({
  maybeAquaLogLevel,
  commandObj,
  isInteractive,
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
    isInteractive,
    message: "Select a valid compiler log level",
    oneChoiceMessage() {
      return commandObj.error("Unreachable");
    },
    onNoChoices() {
      return commandObj.error("Unreachable");
    },
    options: [...AQUA_LOG_LEVELS],
  });
};

type RunArgs = {
  commandObj: CommandObj;
  maybeFluenceConfig: FluenceConfig | null;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  maybeAppConfig: AppConfigReadonly | null;
  relay: string;
  funcCallStr: string;
  aquaFilePath: string;
  timeout: number | undefined;
  aquaImports: string[];
  jsonServicePaths: string[];
  secretKey: string;
  plugin: string | undefined;
  consts: Array<string>;
  logLevelCompiler: AquaLogLevel | undefined;
  logLevelAVM: AvmLoglevel | undefined;
  printAir: boolean;
  data: Data | undefined;
  appJsonServicePath: string;
  noXor: boolean;
  noRelay: boolean;
  on: string | undefined;
};

const aquaRun = async ({
  commandObj,
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  maybeAppConfig,
  relay,
  funcCallStr,
  aquaFilePath,
  timeout,
  aquaImports,
  jsonServicePaths,
  secretKey,
  plugin,
  consts,
  logLevelCompiler,
  printAir,
  data,
  appJsonServicePath,
  noXor,
  noRelay,
  on,
}: RunArgs) => {
  const aquaCli = await initAquaCli(
    commandObj,
    maybeFluenceConfig,
    maybeFluenceLockConfig
  );

  let result;

  try {
    result = await aquaCli(
      {
        args: ["run"],
        flags: {
          addr: relay,
          func: funcCallStr,
          input: aquaFilePath,
          timeout: timeout,
          import: aquaImports,
          "json-service": jsonServicePaths,
          sk: secretKey,
          plugin,
          const: consts,
          "print-air": printAir,
          ...(data === undefined ? {} : { data: JSON.stringify(data) }),
          "log-level": logLevelCompiler,
          "no-xor": noXor,
          "no-relay": noRelay,
          on,
        },
      },
      "Running",
      { function: funcCallStr, relay }
    );
  } finally {
    if (maybeAppConfig !== null) {
      await unlink(appJsonServicePath);
    }
  }

  return result;
};

const fluenceRun = async ({
  commandObj,
  relay,
  funcCallStr,
  aquaFilePath,
  aquaImports,
  secretKey,
  consts,
  logLevelCompiler,
  logLevelAVM,
  printAir,
  timeout,
  data,
  noXor,
  noRelay,
}: RunArgs) => {
  const fluencePeer = new FluencePeer();

  const [{ funcDef, script }] = await Promise.all([
    compile({
      funcCallStr,
      data,
      absoluteAquaFilePath: aquaFilePath,
      aquaImports,
      constants: consts,
      logLevelCompiler,
      noXor,
      noRelay,
    }),
    fluencePeer.start({
      connectTo: relay,
      KeyPair: await KeyPair.fromEd25519SK(Buffer.from(secretKey, "base64")),
      ...(typeof logLevelAVM === "string"
        ? { debug: { marineLogLevel: logLevelAVM } }
        : {}),
      ...(typeof timeout === "number" ? { defaultTtlMs: timeout } : {}),
    }),
  ]);

  if (printAir) {
    commandObj.log(script);
  }

  const result = await callFunctionImpl(
    funcDef,
    script,
    {},
    fluencePeer,
    data ?? {}
  );

  await fluencePeer.stop();

  return result;
};
