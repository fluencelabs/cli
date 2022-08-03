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
import { initNewReadonlyFluenceConfig } from "../lib/configs/project/fluence";
import {
  CommandObj,
  FS_OPTIONS,
  RECOMMENDED_GIT_IGNORE_CONTENT,
  NO_INPUT_FLAG,
} from "../lib/const";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import {
  ensureFluenceAquaDir,
  ensureVSCodeExtensionsJsonPath,
  ensureVSCodeSettingsJsonPath,
  ensureSrcAquaMainPath,
  getGitignorePath,
} from "../lib/paths";
import { input } from "../lib/prompt";

export const PATH = "PATH";

export default class Init extends Command {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: PATH,
      description: "Project path",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);
    const isInteractive = getIsInteractive(flags);
    const projectPath: unknown = args[PATH];
    assert(projectPath === undefined || typeof projectPath === "string");

    await init({
      commandObj: this,
      isInteractive,
      projectPath,
    });
  }
}

const RECOMMENDATIONS = "recommendations";

type ExtensionsJson = {
  [RECOMMENDATIONS]?: Array<string>;
};

const extensionsJsonSchema: JSONSchemaType<ExtensionsJson> = {
  type: "object",
  properties: {
    [RECOMMENDATIONS]: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: [],
};

const validateExtensionsJson = ajv.compile(extensionsJsonSchema);

const extensionsConfig: ExtensionsJson = {
  [RECOMMENDATIONS]: ["redhat.vscode-yaml", "FluenceLabs.aqua"],
};

const ensureRecommendedExtensions = async (): Promise<void> => {
  const extensionsJsonPath = await ensureVSCodeExtensionsJsonPath();

  let fileContent: string;

  try {
    fileContent = await fsPromises.readFile(extensionsJsonPath, FS_OPTIONS);
  } catch {
    fileContent = JSON.stringify({});
    await fsPromises.writeFile(extensionsJsonPath, fileContent, FS_OPTIONS);
    return;
  }

  let parsedFileContent: unknown;

  try {
    parsedFileContent = JSON.parse(fileContent);
  } catch {
    return;
  }

  if (validateExtensionsJson(parsedFileContent)) {
    parsedFileContent[RECOMMENDATIONS] = [
      ...new Set([
        ...(parsedFileContent[RECOMMENDATIONS] ?? []),
        ...(extensionsConfig[RECOMMENDATIONS] ?? []),
      ]),
    ];

    await fsPromises.writeFile(
      extensionsJsonPath,
      JSON.stringify(parsedFileContent, null, 2) + "\n",
      FS_OPTIONS
    );
  }
};

const AQUA_SETTINGS_IMPORTS = "aquaSettings.imports";

type SettingsJson = {
  [AQUA_SETTINGS_IMPORTS]?: Array<string>;
};

const settingsJsonSchema: JSONSchemaType<SettingsJson> = {
  type: "object",
  properties: {
    [AQUA_SETTINGS_IMPORTS]: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: [],
};

const validateSettingsJson = ajv.compile(settingsJsonSchema);

const initSettingsConfig = async (): Promise<SettingsJson> => ({
  [AQUA_SETTINGS_IMPORTS]: [await ensureFluenceAquaDir()],
});

const ensureRecommendedSettings = async (): Promise<void> => {
  const settingsJsonPath = await ensureVSCodeSettingsJsonPath();

  let fileContent: string;

  try {
    fileContent = await fsPromises.readFile(settingsJsonPath, FS_OPTIONS);
  } catch {
    fileContent = JSON.stringify({});
    await fsPromises.writeFile(settingsJsonPath, fileContent, FS_OPTIONS);
    return;
  }

  let parsedFileContent: unknown;

  try {
    parsedFileContent = JSON.parse(fileContent);
  } catch {
    return;
  }

  if (validateSettingsJson(parsedFileContent)) {
    parsedFileContent[AQUA_SETTINGS_IMPORTS] = [
      ...new Set([
        ...(parsedFileContent[AQUA_SETTINGS_IMPORTS] ?? []),
        ...((await initSettingsConfig())[AQUA_SETTINGS_IMPORTS] ?? []),
      ]),
    ];

    await fsPromises.writeFile(
      settingsJsonPath,
      JSON.stringify(parsedFileContent, null, 2) + "\n",
      FS_OPTIONS
    );
  }
};

const ensureGitIgnore = async (): Promise<void> => {
  const gitIgnorePath = getGitignorePath();
  let newGitIgnoreContent: string;

  try {
    const currentGitIgnoreContent = await fsPromises.readFile(
      gitIgnorePath,
      FS_OPTIONS
    );

    const currentGitIgnoreEntries = new Set(
      currentGitIgnoreContent.split("\n")
    );

    const missingGitIgnoreEntries = RECOMMENDED_GIT_IGNORE_CONTENT.split("\n")
      .filter((entry): boolean => !currentGitIgnoreEntries.has(entry))
      .join("\n");

    newGitIgnoreContent =
      missingGitIgnoreEntries === ""
        ? currentGitIgnoreContent
        : `${currentGitIgnoreContent}\n# recommended by Fluence Labs:\n${missingGitIgnoreEntries}\n`;
  } catch {
    newGitIgnoreContent = RECOMMENDED_GIT_IGNORE_CONTENT;
  }

  return fsPromises.writeFile(gitIgnorePath, newGitIgnoreContent, FS_OPTIONS);
};

type InitArg = {
  commandObj: CommandObj;
  isInteractive: boolean;
  projectPath?: string | undefined;
};

export const init = async (options: InitArg): Promise<void> => {
  const { commandObj, isInteractive } = options;

  const projectPath =
    options.projectPath === undefined && !isInteractive
      ? process.cwd()
      : path.resolve(
          options.projectPath ??
            (await input({
              message:
                "Enter project path or press enter to init in the current directory:",
              isInteractive,
            }))
        );

  try {
    await fsPromises.mkdir(projectPath, { recursive: true });
    process.chdir(projectPath);

    await initNewReadonlyFluenceConfig(commandObj);

    const srcMainAquaPath = await ensureSrcAquaMainPath();

    try {
      await fsPromises.access(srcMainAquaPath);
    } catch {
      await fsPromises.writeFile(srcMainAquaPath, "");
    }

    await ensureRecommendedExtensions();
    await ensureRecommendedSettings();
    await ensureGitIgnore();

    commandObj.log(
      color.magentaBright(
        `\nSuccessfully initialized Fluence project template at ${replaceHomeDir(
          projectPath
        )}\n`
      )
    );
  } catch (error) {
    commandObj.error(String(error));
  }
};
