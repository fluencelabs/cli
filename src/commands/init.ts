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
  RECOMMENDED_GITIGNORE_CONTENT,
  NO_INPUT_FLAG,
  MAIN_AQUA_FILE_CONTENT,
} from "../lib/const";
import { ensureVSCodeSettingsJSON } from "../lib/helpers/aquaImports";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import {
  ensureVSCodeExtensionsJsonPath,
  ensureSrcAquaMainPath,
  getGitignorePath,
  setProjectRootDir,
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

const ensureVSCodeRecommendedExtensions = async (): Promise<void> => {
  const extensionsJsonPath = await ensureVSCodeExtensionsJsonPath();

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

    const missingGitIgnoreEntries = RECOMMENDED_GITIGNORE_CONTENT.split("\n")
      .filter((entry): boolean => !currentGitIgnoreEntries.has(entry))
      .join("\n");

    newGitIgnoreContent =
      missingGitIgnoreEntries === ""
        ? currentGitIgnoreContent
        : `${currentGitIgnoreContent}\n# recommended by Fluence Labs:\n${missingGitIgnoreEntries}\n`;
  } catch {
    newGitIgnoreContent = RECOMMENDED_GITIGNORE_CONTENT;
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
    setProjectRootDir(projectPath);
    await initNewReadonlyFluenceConfig(commandObj);

    const srcMainAquaPath = await ensureSrcAquaMainPath();

    try {
      await fsPromises.access(srcMainAquaPath);
    } catch {
      await fsPromises.writeFile(
        srcMainAquaPath,
        MAIN_AQUA_FILE_CONTENT,
        FS_OPTIONS
      );
    }

    await ensureVSCodeRecommendedExtensions();
    await ensureVSCodeSettingsJSON({ generateSettingsJson: true, commandObj });
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
