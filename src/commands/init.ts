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
import { Command, Flags } from "@oclif/core";
import type { JSONSchemaType } from "ajv";

import { ajv } from "../lib/ajv";
import {
  FluenceConfig,
  initNewFluenceConfig,
} from "../lib/configs/project/fluence";
import {
  CommandObj,
  FS_OPTIONS,
  RECOMMENDED_GITIGNORE_CONTENT,
  NO_INPUT_FLAG,
  Template,
  templates,
  isTemplate,
  FLUENCE_JS_RECOMMENDED_VERSION,
  FLUENCE_NETWORK_INVIRONMENT_RECOMMENDED_VERSION,
  PACKAGE_JSON_FILE_NAME,
  INDEX_JS_FILE_NAME,
  INDEX_TS_FILE_NAME,
  SRC_DIR_NAME,
  getTemplateIndexFileContent,
  TYPESCRIPT_RECOMMENDED_VERSION,
  TS_NODE_RECOMMENDED_VERSION,
  TS_CONFIG_FILE_NAME,
  IS_DEVELOPMENT,
} from "../lib/const";
import { execPromise } from "../lib/execPromise";
import { ensureVSCodeSettingsJSON } from "../lib/helpers/aquaImports";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir";
import {
  ensureDefaultAquaJSPath,
  ensureDefaultAquaTSPath,
  ensureDefaultJSDirPath,
  ensureDefaultTSDirPath,
  ensureVSCodeExtensionsJsonPath,
  getGitignorePath,
  projectRootDirPromise,
  setProjectRootDir,
} from "../lib/paths";
import { input, list } from "../lib/prompt";

export const PATH = "PATH";

export default class Init extends Command {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    template: Flags.string({
      description: `Template to use for the project. One of: ${templates.join(
        ", "
      )}`,
      char: "t",
    }),
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
      template: await ensureTemplate({
        isInteractive,
        commandObj: this,
        templateOrUnknown: flags.template,
      }),
    });
  }
}

type SelectTemplateArg = {
  commandObj: CommandObj;
  isInteractive: boolean;
};

const selectTemplate = ({
  commandObj,
  isInteractive,
}: SelectTemplateArg): Promise<Template> =>
  list({
    message: "Select template",
    options: [...templates],
    oneChoiceMessage: (): never =>
      commandObj.error("Unreachable: only one template"),
    onNoChoices: (): never => commandObj.error("Unreachable: no templates"),
    isInteractive,
  });

type EnsureTemplateArg = {
  templateOrUnknown: string | undefined;
  commandObj: CommandObj;
  isInteractive: boolean;
};

const ensureTemplate = ({
  commandObj,
  isInteractive,
  templateOrUnknown,
}: EnsureTemplateArg): Promise<Template> => {
  if (isTemplate(templateOrUnknown)) {
    return Promise.resolve(templateOrUnknown);
  }

  if (typeof templateOrUnknown === "string") {
    commandObj.warn(
      `Unknown template: ${color.yellow(
        templateOrUnknown
      )}. Available templates: ${templates.join(", ")}`
    );
  }

  return selectTemplate({ commandObj, isInteractive });
};

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
  const gitIgnorePath = await getGitignorePath();
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
  template?: Template;
};

export const init = async (options: InitArg): Promise<FluenceConfig> => {
  const {
    commandObj,
    isInteractive,
    template = await selectTemplate({ commandObj, isInteractive }),
  } = options;

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

  await fsPromises.mkdir(projectPath, { recursive: true });
  setProjectRootDir(projectPath);

  const fluenceConfig = await initNewFluenceConfig(commandObj);

  switch (template) {
    case "minimal":
      break;

    case "js": {
      await initTSorJSProject({ isJS: true, fluenceConfig });
      break;
    }

    case "ts": {
      await initTSorJSProject({ isJS: false, fluenceConfig });
      break;
    }

    default: {
      const _exhaustiveCheck: never = template;
      return _exhaustiveCheck;
    }
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

  return fluenceConfig;
};

type InitTSorJSProjectArg = {
  isJS: boolean;
  fluenceConfig: FluenceConfig;
};

export const initTSorJSProject = async ({
  isJS,
  fluenceConfig,
}: InitTSorJSProjectArg): Promise<void> => {
  const defaultAquaTSorJSPath = isJS
    ? await ensureDefaultAquaJSPath()
    : await ensureDefaultAquaTSPath();

  const projectRootDir = await projectRootDirPromise;

  const defaultAquaTSorJSPathRelative = path.relative(
    projectRootDir,
    defaultAquaTSorJSPath
  );

  const defaultTSorJSDirPath = isJS
    ? await ensureDefaultJSDirPath()
    : await ensureDefaultTSDirPath();

  const indexFileName = isJS ? INDEX_JS_FILE_NAME : INDEX_TS_FILE_NAME;

  const PACKAGE_JSON = {
    name: path.dirname(projectRootDir),
    version: "1.0.0",
    description: "",
    main: indexFileName,
    ...(isJS ? { type: "module" } : {}),
    scripts: {
      postinstall: IS_DEVELOPMENT
        ? `${path.relative(
            defaultTSorJSDirPath,
            path.join(process.cwd(), "bin", "dev")
          )} aqua`
        : "fluence aqua",
      start: `${isJS ? "node" : "ts-node"} ${path.join(
        SRC_DIR_NAME,
        indexFileName
      )}`,
    },
    keywords: ["fluence"],
    author: "",
    license: "ISC",
    dependencies: {
      "@fluencelabs/fluence": FLUENCE_JS_RECOMMENDED_VERSION,
      "@fluencelabs/fluence-network-environment":
        FLUENCE_NETWORK_INVIRONMENT_RECOMMENDED_VERSION,
      ...(isJS ? {} : { "ts-node": TS_NODE_RECOMMENDED_VERSION }),
      typescript: TYPESCRIPT_RECOMMENDED_VERSION,
    },
  } as const;

  await fsPromises.writeFile(
    path.join(defaultTSorJSDirPath, PACKAGE_JSON_FILE_NAME),
    JSON.stringify(PACKAGE_JSON, null, 2) + "\n",
    FS_OPTIONS
  );

  await fsPromises.writeFile(
    path.join(defaultTSorJSDirPath, SRC_DIR_NAME, indexFileName),
    getTemplateIndexFileContent(isJS),
    FS_OPTIONS
  );

  if (isJS) {
    fluenceConfig.aquaOutputJSPath = defaultAquaTSorJSPathRelative;
    fluenceConfig.appJSPath = defaultAquaTSorJSPathRelative;
  } else {
    const TS_CONFIG = {
      compilerOptions: {
        target: "es2016",
        module: "commonjs",
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        skipLibCheck: true,
      },
    };

    await fsPromises.writeFile(
      path.join(defaultTSorJSDirPath, SRC_DIR_NAME, TS_CONFIG_FILE_NAME),
      JSON.stringify(TS_CONFIG),
      FS_OPTIONS
    );

    fluenceConfig.aquaOutputTSPath = defaultAquaTSorJSPathRelative;
    fluenceConfig.appTSPath = defaultAquaTSorJSPathRelative;
  }

  await fluenceConfig.$commit();

  await execPromise({
    printOutput: true,
    command: "npm",
    args: ["i"],
    options: { cwd: defaultTSorJSDirPath },
    message: `Installing npm dependencies for ${
      isJS ? "JS" : "TS"
    } project and compiling aqua example`,
  });
};
