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
import { dirname, resolve } from "node:path";

import type { AvmLoglevel } from "@fluencelabs/fluence";
import { callFunctionImpl } from "@fluencelabs/fluence/dist/internal/compilerSupport/v3impl/callFunction.js";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { ajv } from "../lib/ajvInstance.js";
import { compile, Data } from "../lib/aqua.js";
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
  defaultFluenceLockConfig,
  FluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../lib/configs/project/fluenceLock.js";
import {
  FS_OPTIONS,
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
} from "../lib/const.js";
import { getAppJson } from "../lib/deployedApp.js";
import { startFluencePeer } from "../lib/fluencePeer.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { getExistingKeyPairFromFlags } from "../lib/keypairs.js";
import { initCli } from "../lib/lifecyle.js";
import { getRandomRelayAddr } from "../lib/multiaddres.js";
import {
  ensureFluenceTmpAppServiceJsonPath,
  projectRootDirPromise,
  recursivelyFindProjectRootDir,
  setProjectRootDir,
} from "../lib/paths.js";
import { input, list } from "../lib/prompt.js";

const FUNC_FLAG_NAME = "func";
const INPUT_FLAG_NAME = "input";
// const ON_FLAG_NAME = "on";
const DATA_FLAG_NAME = "data";
const JSON_SERVICE = "json-service";
const LOG_LEVEL_COMPILER_FLAG_NAME = "log-level-compiler";
const LOG_LEVEL_AVM_FLAG_NAME = "log-level-avm";
const PRINT_PARTICLE_ID_FLAG_NAME = "print-particle-id";

export default class Run extends BaseCommand<typeof Run> {
  static override description = "Run aqua script";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
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
    [PRINT_PARTICLE_ID_FLAG_NAME]: Flags.boolean({
      description:
        "If set, newly initiated particle ids will be printed to console. Useful to see what particle id is responsible for aqua function",
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
    ...TIMEOUT_FLAG,
    ...KEY_PAIR_FLAG,
  };
  async run(): Promise<void> {
    const parseResult = await this.parse(Run);
    const inputFlag = parseResult.flags[INPUT_FLAG_NAME];

    if (typeof inputFlag === "string") {
      const resolvedInputDirName = resolve(dirname(inputFlag));

      const projectRootDir = await recursivelyFindProjectRootDir(
        resolvedInputDirName
      );

      setProjectRootDir(projectRootDir);
    }

    const { flags, maybeFluenceConfig } = await initCli(this, parseResult);

    const marineLogLevel: AvmLoglevel | undefined = await resolveAVMLogLevel({
      maybeAVMLogLevel: flags[LOG_LEVEL_AVM_FLAG_NAME],
      isQuite: flags.quiet,
    });

    const logLevelCompiler: AquaLogLevel | undefined =
      await resolveAquaLogLevel({
        maybeAquaLogLevel: flags[LOG_LEVEL_COMPILER_FLAG_NAME],
        isQuite: flags.quiet,
      });

    if (flags.quiet) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.log = () => {};
    }

    // if (typeof flags[ON_FLAG_NAME] === "string") {
    //   const onPeerConst = `ON_PEER = "${flags[ON_FLAG_NAME]}"`;

    //   flags.const =
    //     flags.const === undefined
    //       ? [onPeerConst]
    //       : [...flags.const, onPeerConst];
    // }

    const {
      const: constants = [],
      "no-relay": noRelay,
      "no-xor": noXor,
      "print-air": printAir,
      plugin,
      timeout,
    } = flags;

    const keyPair = await getExistingKeyPairFromFlags(
      flags,
      maybeFluenceConfig
    );

    if (keyPair instanceof Error) {
      this.error(keyPair.message);
    }

    const secretKey = keyPair.secretKey;

    const aquaFilePath = await ensureAquaPath({
      aquaPathFromFlags: flags[INPUT_FLAG_NAME],
      maybeFluenceConfig,
    });

    const funcCall =
      flags[FUNC_FLAG_NAME] ??
      (await input({
        message: `Enter a function call that you want to execute`,
        flagName: FUNC_FLAG_NAME,
      }));

    const maybeAppConfig = await initReadonlyAppConfig();

    const relay =
      flags.relay ??
      getRandomRelayAddr(maybeAppConfig?.relays ?? maybeFluenceConfig?.relays);

    const [data, appJsonServicePath, maybeFluenceLockConfig] =
      await Promise.all([
        getRunData(flags),
        ensureFluenceTmpAppServiceJsonPath(),
        initFluenceLockConfig(),
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
            flags,
            maybeFluenceConfig,
            maybeFluenceLockConfig: null,
          })
        : await ensureAquaImports({
            flags,
            maybeFluenceConfig,
            maybeFluenceLockConfig:
              maybeFluenceLockConfig ??
              (await initNewFluenceLockConfig(defaultFluenceLockConfig)),
          });

    const runArgs: RunArgs = {
      appJsonServicePath,
      filePath: aquaFilePath,
      imports: aquaImports,
      constants,
      data,
      funcCall,
      jsonServicePaths,
      marineLogLevel,
      printParticleId: flags[PRINT_PARTICLE_ID_FLAG_NAME],
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
    };

    const useAquaRun =
      typeof flags.plugin === "string" || jsonServicePaths.length > 0;

    const result: unknown = await (useAquaRun
      ? aquaRun(runArgs)
      : fluenceRun(runArgs));

    const stringResult = JSON.stringify(result);

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
    message: "Enter path to the input file or directory",
    flagName: "input",
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
}): Promise<Data | undefined> => {
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
  maybeAVMLogLevel: string | undefined;
  isQuite: boolean;
};

const resolveAVMLogLevel = async ({
  maybeAVMLogLevel,
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
    message: "Select a valid AVM log level",
    oneChoiceMessage() {
      throw new Error("Unreachable");
    },
    onNoChoices() {
      throw new Error("Unreachable");
    },
    options: AVM_LOG_LEVELS,
  });
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

type RunArgs = {
  maybeFluenceConfig: FluenceConfig | null;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  maybeAppConfig: AppConfigReadonly | null;
  relay: string;
  funcCall: string;
  filePath: string;
  timeout: number | undefined;
  imports: string[];
  jsonServicePaths: string[];
  secretKey: string;
  plugin: string | undefined;
  constants: Array<string>;
  logLevelCompiler: AquaLogLevel | undefined;
  marineLogLevel: AvmLoglevel | undefined;
  printParticleId: boolean;
  printAir: boolean;
  data: Data | undefined;
  appJsonServicePath: string;
  noXor: boolean;
  noRelay: boolean;
};

const aquaRun = async ({
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  maybeAppConfig,
  relay,
  funcCall,
  filePath,
  timeout,
  imports,
  jsonServicePaths,
  secretKey,
  plugin,
  constants,
  logLevelCompiler,
  printAir,
  data,
  appJsonServicePath,
  noXor,
  noRelay,
}: RunArgs) => {
  const aquaCli = await initAquaCli(maybeFluenceConfig, maybeFluenceLockConfig);

  let result;

  try {
    result = await aquaCli(
      {
        args: ["run"],
        flags: {
          addr: relay,
          func: funcCall,
          input: filePath,
          timeout: timeout,
          import: imports,
          "json-service": jsonServicePaths,
          sk: secretKey,
          plugin,
          const: constants,
          "print-air": printAir,
          ...(data === undefined ? {} : { data: JSON.stringify(data) }),
          "log-level": logLevelCompiler,
          "no-xor": noXor,
          "no-relay": noRelay,
        },
      },
      "Running",
      { function: funcCall, relay }
    );
  } finally {
    if (maybeAppConfig !== null) {
      await unlink(appJsonServicePath);
    }
  }

  return result;
};

const fluenceRun = async ({
  relay,
  funcCall,
  filePath,
  imports,
  secretKey,
  constants,
  logLevelCompiler,
  marineLogLevel,
  printParticleId,
  printAir,
  timeout,
  data,
  noXor,
  noRelay,
}: RunArgs) => {
  const [{ functionCall, errors }, fluencePeer] = await Promise.all([
    compile({
      funcCall,
      data,
      filePath,
      imports,
      constants,
      logLevel: logLevelCompiler,
      noXor,
      noRelay,
    }),
    startFluencePeer({
      relay,
      secretKey,
      marineLogLevel,
      printParticleId,
      timeout,
    }),
  ]);

  if (errors.length > 0) {
    commandObj.error(errors.join("\n"));
  }

  const { funcDef, script } = functionCall;

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
