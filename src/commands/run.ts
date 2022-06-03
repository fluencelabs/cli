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
import { ensureAppServicesAquaFile } from "../lib/aqua/ensureAppServicesAquaFile";
import { initAquaCli } from "../lib/aquaCli";
import { initReadonlyAppConfig } from "../lib/configs/project/app";
import { CommandObj, FS_OPTIONS } from "../lib/const";
import { usage } from "../lib/helpers/usage";
import { getRandomRelayId, getRelayAddr } from "../lib/multiaddr";
import { getMaybeArtifactsPath } from "../lib/pathsGetters/getArtifactsPath";
import { getSrcAquaDirPath } from "../lib/pathsGetters/getSrcAquaDirPath";
import { confirm, input, list } from "../lib/prompt";

export default class Run extends Command {
  static override description = "Run aqua script";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    on: Flags.string({
      description: "PeerId of the peer where you want to run the function",
      helpValue: "<peer_id>",
    }),
    aqua: Flags.string({
      description:
        "Path to an aqua file or to a directory that contains your aqua files",
      helpValue: "<path>",
    }),
    func: Flags.string({
      char: "f",
      description: "Function call",
      helpValue: "<function-call>",
    }),
    relay: Flags.string({
      description: "Relay node MultiAddress",
      helpValue: "<multiaddr>",
    }),
    timeout: Flags.string({
      description: "Run timeout",
      helpValue: "<milliseconds>",
    }),
    data: Flags.string({
      description:
        "JSON in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<json>",
    }),
    "data-path": Flags.string({
      description:
        "Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<path>",
    }),
    import: Flags.string({
      description:
        "Path to the directory to import from. May be used several times",
      helpValue: "<path>",
    }),
  };

  static override usage: string = usage(this);

  async run(): Promise<void> {
    const { flags } = await this.parse(Run);

    const on = await ensurePeerId(flags.on, this);
    const aqua = await ensureAquaPath(flags.aqua);

    const func =
      flags.func ??
      (await input({
        message: "Enter a function call that you want to execute",
      }));

    const relay = flags.relay ?? getRelayAddr(on);

    const data = await getRunData(flags, this);
    const imports = [
      flags.import,
      await ensureAppServicesAquaFile(this),
      await getMaybeArtifactsPath(),
    ];

    const aquaCli = await initAquaCli(this);
    const result = await aquaCli(
      {
        command: "run",
        flags: {
          addr: relay,
          func,
          input: aqua,
          on,
          timeout: flags.timeout,
          import: imports,
          ...data,
        },
      },
      "Running",
      { function: func, on, relay }
    );

    this.log(`\n${color.yellow("Result:")}\n\n${result}`);
  }
}

const ensurePeerId = async (
  onFromArgs: string | undefined,
  commandObj: CommandObj
): Promise<string> => {
  if (typeof onFromArgs === "string") {
    return onFromArgs;
  }
  const appConfig = await initReadonlyAppConfig(commandObj);

  const peerIdsFromDeployed = [
    ...new Set((appConfig?.services ?? []).map(({ peerId }): string => peerId)),
  ];
  const firstPeerId = peerIdsFromDeployed[0];
  const peerIdFromDeployed =
    peerIdsFromDeployed.length === 1 && firstPeerId !== undefined
      ? firstPeerId
      : null;

  if (typeof peerIdFromDeployed === "string") {
    return peerIdFromDeployed;
  }

  const choices =
    peerIdsFromDeployed.length > 1 &&
    (await confirm({
      message:
        "Do you want to select one of the peers from your app to run the function?",
    }))
      ? peerIdsFromDeployed
      : [getRandomRelayId()];

  return list({
    message: "Select peerId of the peer where you want to run the function",
    choices,
    onNoChoices: (): Promise<string> =>
      input({
        message: "Enter peerId of the peer where you want to run your function",
      }),
    oneChoiceMessage: (peerId): string =>
      `Do you want to run your function on a random peer ${color.yellow(
        peerId
      )}`,
  });
};

const ensureAquaPath = async (
  aquaPathFromArgs: string | undefined
): Promise<string> => {
  if (typeof aquaPathFromArgs === "string") {
    return aquaPathFromArgs;
  }

  try {
    const srcAquaDirPath = getSrcAquaDirPath();
    await fsPromises.access(srcAquaDirPath);
    return srcAquaDirPath;
  } catch {
    return input({
      message:
        "Enter a path to an aqua file or to a directory that contains your aqua files",
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
  const appConfig = await initReadonlyAppConfig(commandObj);
  const runData: RunData =
    appConfig === null ? {} : { app: appConfig.services };
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
