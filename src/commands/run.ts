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

import fsPromises from "node:fs/promises";

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { ajv } from "../lib/ajv";
import { initAquaCli } from "../lib/aquaCli";
import { initReadonlyAppConfig } from "../lib/configs/project/app";
import {
  CommandObj,
  FS_OPTIONS,
  NO_INPUT_FLAG,
  TIMEOUT_FLAG,
} from "../lib/const";
import { getAppJson } from "../lib/deployedApp";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { usage } from "../lib/helpers/usage";
import { getRandomRelayAddr } from "../lib/multiaddr";
import { getDefaultAquaPath } from "../lib/pathsGetters/getDefaultAquaPath";
import { getSrcMainAquaPath } from "../lib/pathsGetters/getSrcAquaDirPath";
import {
  getAppServiceJsonPath,
  getTmpPath,
} from "../lib/pathsGetters/getTmpPath";
import { input } from "../lib/prompt";

const FUNC_FLAG_NAME = "func";
const INPUT_FLAG_NAME = "input";
const ON_FLAG_NAME = "on";

export default class Run extends Command {
  static override description = "Run aqua script";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    relay: Flags.string({
      description: "Relay node MultiAddress",
      helpValue: "<multiaddr>",
    }),
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
    import: Flags.string({
      description:
        "Path to a directory to import from. May be used several times",
      helpValue: "<path>",
      multiple: true,
    }),
    "json-service": Flags.file({
      description: "Path to a file that contains a JSON formatted service",
      helpValue: "<path>",
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
    ...TIMEOUT_FLAG,
    ...NO_INPUT_FLAG,
  };

  static override usage: string = usage(this);

  async run(): Promise<void> {
    const { flags } = await this.parse(Run);
    const isInteractive = getIsInteractive(flags);

    const aqua = await ensureAquaPath(flags[INPUT_FLAG_NAME], isInteractive);

    const func =
      flags[FUNC_FLAG_NAME] ??
      (await input({
        message: `Enter a function call that you want to execute`,
        isInteractive,
        flagName: FUNC_FLAG_NAME,
      }));

    const relay = flags.relay ?? getRandomRelayAddr();

    const data = await getRunData(flags, this);
    const imports = [...(flags.import ?? []), getDefaultAquaPath()];

    const appConfig = await initReadonlyAppConfig(this);
    await fsPromises.mkdir(getTmpPath(), { recursive: true });
    const appJsonServicePath = getAppServiceJsonPath();
    if (appConfig !== null) {
      await fsPromises.writeFile(
        appJsonServicePath,
        getAppJson(appConfig.services),
        FS_OPTIONS
      );
    }
    let result: string;
    const aquaCli = await initAquaCli(this);
    try {
      result = await aquaCli(
        {
          command: "run",
          flags: {
            addr: relay,
            func,
            input: aqua,
            timeout: flags.timeout,
            import: imports,
            "json-service": appJsonServicePath,
            ...data,
          },
        },
        "Running",
        { function: func, relay }
      );
    } finally {
      if (appConfig !== null) {
        await fsPromises.unlink(appJsonServicePath);
      }
    }

    this.log(`\n${color.yellow("Result:")}\n\n${result}`);
  }
}

const ensureAquaPath = async (
  aquaPathFromArgs: string | undefined,
  isInteractive: boolean
): Promise<string> => {
  if (typeof aquaPathFromArgs === "string") {
    return aquaPathFromArgs;
  }

  try {
    const srcMainAquaPath = getSrcMainAquaPath();
    await fsPromises.access(srcMainAquaPath);
    return srcMainAquaPath;
  } catch {
    return input({
      message:
        "Enter a path to an aqua file or to a directory that contains aqua files",
      isInteractive,
      flagName: INPUT_FLAG_NAME,
    });
  }
};

type RunData = Record<string, unknown>;

const runDataSchema: JSONSchemaType<RunData> = {
  type: "object",
};

const validateRunData = ajv.compile(runDataSchema);

const getRunData = async (
  flags: { data: string | undefined; "data-path": string | undefined },
  commandObj: CommandObj
): Promise<{ data: string } | Record<string, never>> => {
  const runData: RunData = {};
  const { data, "data-path": dataPath } = flags;

  if (typeof dataPath === "string") {
    let data: string;
    try {
      data = await fsPromises.readFile(dataPath, FS_OPTIONS);
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
      commandObj.error("Unable to parse --data");
    }
    if (!validateRunData(parsedData)) {
      commandObj.error(
        `Invalid --data: ${JSON.stringify(validateRunData.errors)}`
      );
    }
    for (const key in parsedData) {
      if (Object.prototype.hasOwnProperty.call(parsedData, key)) {
        runData[key] = parsedData[key];
      }
    }
  }

  const dataString = JSON.stringify(runData);

  return dataString === "{}" ? {} : { data: dataString };
};
