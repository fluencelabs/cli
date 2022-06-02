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
  NAME_ARG,
  AQUA_DIR_NAME,
  SETTINGS_JSON_FILE_NAME,
  DEFAULT_SRC_AQUA_FILE_NAME,
} from "../lib/const";
import { usage } from "../lib/helpers/usage";
import { getArtifactsPath } from "../lib/pathsGetters/getArtifactsPath";
import { getSrcAquaDirPath } from "../lib/pathsGetters/getSrcAquaDirPath";
import { input } from "../lib/prompt";

export default class Init extends Command {
  static override description =
    "Initialize fluence project in the current directory";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  // TODO DXJ-31: add "--path" optional flag to set path of the project
  static override args = [{ name: NAME_ARG, description: "Project name" }];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { args } = await this.parse(Init);
    await init(this, args[NAME_ARG]);
  }
}

const validateProjectName = async (name: string): Promise<string | true> => {
  const projectPath = path.join(process.cwd(), name);
  try {
    await fsPromises.access(projectPath);
    return `file or directory ${color.yellow(name)} already exists`;
  } catch {
    return true;
  }
};

const ensureNameIsValid = async (
  name: string,
  commandObj: CommandObj
): Promise<string> => {
  const validOrWarning = await validateProjectName(name);
  if (validOrWarning === true) {
    return name;
  }

  commandObj.warn(validOrWarning);

  const projectName = await input({
    message: "Enter project name:",
    validate: validateProjectName,
  });

  return projectName;
};

const getProjectPath = async (
  name: string | undefined,
  commandObj: CommandObj
): Promise<string> => {
  if (name === undefined) {
    return process.cwd();
  }

  const validName = await ensureNameIsValid(name, commandObj);
  return path.join(process.cwd(), validName);
};

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
  recommendations: ["redhat.vscode-yaml", "FluenceLabs.aqua-syntax-highlight"],
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
      JSON.stringify(extensionsConfig, null, 2),
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
      JSON.stringify(parsedFileContent, null, 2),
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
      JSON.stringify(await getSettingsConfig(commandObj), null, 2),
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
      JSON.stringify(parsedFileContent, null, 2),
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
    gitIgnoreContent = `${currentGitIgnore}\n${missingGitIgnoreEntries}`;
  } catch {
    gitIgnoreContent = GIT_IGNORE_CONTENT;
  }

  return fsPromises.writeFile(gitIgnorePath, gitIgnoreContent, FS_OPTIONS);
};

export const init = async (
  commandObj: CommandObj,
  projectName?: string
): Promise<void> => {
  const projectPath = await getProjectPath(projectName, commandObj);

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
