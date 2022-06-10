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

import assert from "node:assert";
import fsPromises from "node:fs/promises";
import path from "node:path";

import { color } from "@oclif/color";
import { Command } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { ajv } from "../lib/ajv";
import { ensureAppServicesAquaFile } from "../lib/aqua/ensureAppServicesAquaFile";
import { initReadonlyFluenceConfig } from "../lib/configs/project/fluence";
import {
  CommandObj,
  ARTIFACTS_DIR_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_DIR_NAME,
  FS_OPTIONS,
  SRC_DIR_NAME,
  VSCODE_DIR_NAME,
  GITIGNORE_FILE_NAME,
  GIT_IGNORE_CONTENT,
  AQUA_DIR_NAME,
  SETTINGS_JSON_FILE_NAME,
  DEFAULT_SRC_AQUA_FILE_NAME,
  NO_INPUT_FLAG,
} from "../lib/const";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { usage } from "../lib/helpers/usage";
import { getArtifactsPath } from "../lib/pathsGetters/getArtifactsPath";
import { getSrcAquaDirPath } from "../lib/pathsGetters/getSrcAquaDirPath";
import { input } from "../lib/prompt";

export const NAME_OR_PATH = "NAME-OR-PATH";

export default class Init extends Command {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: NAME_OR_PATH,
      description: "New project directory name or path",
    },
  ];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);
    const isInteractive = getIsInteractive(flags);
    const nameOrPath: unknown = args[NAME_OR_PATH];
    assert(nameOrPath === undefined || typeof nameOrPath === "string");
    await init({
      commandObj: this,
      isInteractive,
      nameOrPath,
    });
  }
}

type ExtensionsJson = {
  recommendations: Array<string>;
};
const extensionsJsonSchema: JSONSchemaType<ExtensionsJson> = {
  type: "object",
  properties: {
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["recommendations"],
};
const validateExtensionsJson = ajv.compile(extensionsJsonSchema);
const extensionsConfig: ExtensionsJson = {
  recommendations: ["redhat.vscode-yaml", "FluenceLabs.aqua"],
};

const ensureRecommendedExtensions = async (
  projectPath: string
): Promise<void> => {
  const vscodeDirPath = path.join(projectPath, VSCODE_DIR_NAME);
  await fsPromises.mkdir(vscodeDirPath, { recursive: true });
  const extensionsJsonPath = path.join(
    vscodeDirPath,
    EXTENSIONS_JSON_FILE_NAME
  );

  let fileContent: string;
  try {
    fileContent = await fsPromises.readFile(extensionsJsonPath, FS_OPTIONS);
  } catch {
    await fsPromises.writeFile(
      extensionsJsonPath,
      JSON.stringify(extensionsConfig, null, 2) + "\n",
      FS_OPTIONS
    );
    return;
  }

  let parsedFileContent: unknown;
  try {
    parsedFileContent = JSON.parse(fileContent);
  } catch {
    return;
  }

  if (validateExtensionsJson(parsedFileContent)) {
    for (const recommendation of extensionsConfig.recommendations) {
      if (!parsedFileContent.recommendations.includes(recommendation)) {
        parsedFileContent.recommendations.push(recommendation);
      }
    }
    await fsPromises.writeFile(
      extensionsJsonPath,
      JSON.stringify(parsedFileContent, null, 2) + "\n",
      FS_OPTIONS
    );
  }
};

type SettingsJson = {
  "aquaSettings.imports": Array<string>;
};
const settingsJsonSchema: JSONSchemaType<SettingsJson> = {
  type: "object",
  properties: {
    "aquaSettings.imports": { type: "array", items: { type: "string" } },
  },
  required: ["aquaSettings.imports"],
};
const validateSettingsJson = ajv.compile(settingsJsonSchema);
const getSettingsConfig = async (
  commandObj: CommandObj
): Promise<SettingsJson> => {
  const settingsConfig = {
    "aquaSettings.imports": [
      await ensureAppServicesAquaFile(commandObj),
      getArtifactsPath(),
    ],
  };

  return settingsConfig;
};

const ensureRecommendedSettings = async (
  projectPath: string,
  commandObj: CommandObj
): Promise<void> => {
  const vscodeDirPath = path.join(projectPath, VSCODE_DIR_NAME);
  await fsPromises.mkdir(vscodeDirPath, { recursive: true });
  const settingsJsonPath = path.join(vscodeDirPath, SETTINGS_JSON_FILE_NAME);

  let fileContent: string;
  try {
    fileContent = await fsPromises.readFile(settingsJsonPath, FS_OPTIONS);
  } catch {
    await fsPromises.writeFile(
      settingsJsonPath,
      JSON.stringify(await getSettingsConfig(commandObj), null, 2) + "\n",
      FS_OPTIONS
    );
    return;
  }

  let parsedFileContent: unknown;
  try {
    parsedFileContent = JSON.parse(fileContent);
  } catch {
    return;
  }

  if (validateSettingsJson(parsedFileContent)) {
    const settingsConfig = await getSettingsConfig(commandObj);
    for (const importItem of settingsConfig["aquaSettings.imports"]) {
      if (!parsedFileContent["aquaSettings.imports"].includes(importItem)) {
        parsedFileContent["aquaSettings.imports"].push(importItem);
      }
    }
    await fsPromises.writeFile(
      settingsJsonPath,
      JSON.stringify(parsedFileContent, null, 2) + "\n",
      FS_OPTIONS
    );
  }
};

const ensureGitIgnore = async (projectPath: string): Promise<void> => {
  let gitIgnoreContent: string;
  const gitIgnorePath = path.join(projectPath, GITIGNORE_FILE_NAME);
  try {
    const currentGitIgnore = await fsPromises.readFile(
      gitIgnorePath,
      FS_OPTIONS
    );
    const currentGitIgnoreEntries = new Set(currentGitIgnore.split("\n"));
    const missingGitIgnoreEntries = GIT_IGNORE_CONTENT.split("\n")
      .filter((entry): boolean => !currentGitIgnoreEntries.has(entry))
      .join("\n");
    gitIgnoreContent =
      missingGitIgnoreEntries === ""
        ? currentGitIgnore
        : `${currentGitIgnore}\n# recommended by Fluence Labs:\n${missingGitIgnoreEntries}\n`;
  } catch {
    gitIgnoreContent = GIT_IGNORE_CONTENT;
  }

  return fsPromises.writeFile(gitIgnorePath, gitIgnoreContent, FS_OPTIONS);
};

type InitOptions = {
  commandObj: CommandObj;
  isInteractive: boolean;
  nameOrPath?: string | undefined;
};

export const init = async (options: InitOptions): Promise<void> => {
  const { commandObj, isInteractive, nameOrPath } = options;

  const projectPath =
    nameOrPath === undefined && !isInteractive
      ? process.cwd()
      : path.resolve(
          nameOrPath ??
            (await input({
              message:
                "Enter project name or path or press enter to init in the current directory:",
              isInteractive,
            }))
        );

  try {
    const fluenceDirPath = path.join(projectPath, FLUENCE_DIR_NAME);
    await fsPromises.mkdir(fluenceDirPath, { recursive: true });
    process.chdir(projectPath);

    await initReadonlyFluenceConfig(commandObj, projectPath);

    const aquaDirPath = path.join(projectPath, SRC_DIR_NAME, AQUA_DIR_NAME);
    await fsPromises.mkdir(aquaDirPath, { recursive: true });
    const defaultSrcAquaFilePath = path.join(
      getSrcAquaDirPath(),
      DEFAULT_SRC_AQUA_FILE_NAME
    );
    try {
      await fsPromises.access(defaultSrcAquaFilePath);
    } catch {
      await fsPromises.writeFile(defaultSrcAquaFilePath, "");
    }

    const artifactsDirPath = path.join(projectPath, ARTIFACTS_DIR_NAME);
    await fsPromises.mkdir(artifactsDirPath, { recursive: true });

    await ensureRecommendedExtensions(projectPath);
    await ensureRecommendedSettings(projectPath, commandObj);
    await ensureGitIgnore(projectPath);
    await ensureAppServicesAquaFile(commandObj);

    commandObj.log(
      color.magentaBright(
        `\nFluence project successfully initialized at ${projectPath}\n`
      )
    );
  } catch (error) {
    commandObj.error(String(error));
  }
};
