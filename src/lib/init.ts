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

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import Countly from "countly-sdk-nodejs";

import { ajv } from "../lib/ajvInstance.js";
import {
  FluenceConfig,
  initNewFluenceConfig,
} from "../lib/configs/project/fluence.js";
import {
  FS_OPTIONS,
  RECOMMENDED_GITIGNORE_CONTENT,
  Template,
  TEMPLATES,
  isTemplate,
  FLUENCE_JS_RECOMMENDED_VERSION,
  FLUENCE_NETWORK_ENVIRONMENT_RECOMMENDED_VERSION,
  PACKAGE_JSON_FILE_NAME,
  INDEX_JS_FILE_NAME,
  INDEX_TS_FILE_NAME,
  SRC_DIR_NAME,
  TEMPLATE_INDEX_FILE_CONTENT,
  TYPESCRIPT_RECOMMENDED_VERSION,
  TS_NODE_RECOMMENDED_VERSION,
  TS_CONFIG_FILE_NAME,
} from "../lib/const.js";
import { execPromise } from "../lib/execPromise.js";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir.js";
import {
  ensureDefaultAquaJSPath,
  ensureDefaultAquaTSPath,
  ensureDefaultJSDirPath,
  ensureDefaultTSDirPath,
  ensureFluenceAquaDealPath,
  ensureFluenceAquaServicesPath,
  ensureVSCodeExtensionsJsonPath,
  getGitignorePath,
  projectRootDir,
  setProjectRootDir,
} from "../lib/paths.js";
import { input, list } from "../lib/prompt.js";

import { commandObj, isInteractive } from "./commandObj.js";
import { ensureVSCodeSettingsJSON } from "./helpers/aquaImports.js";

const selectTemplate = (): Promise<Template> =>
  list({
    message: "Select template",
    options: [...TEMPLATES],
    oneChoiceMessage: (): never => {
      throw new Error("Unreachable: only one template");
    },
    onNoChoices: (): never => {
      throw new Error("Unreachable: no templates");
    },
  });

type EnsureTemplateArg = {
  templateOrUnknown: string | undefined;
};

export const ensureTemplate = ({
  templateOrUnknown,
}: EnsureTemplateArg): Promise<Template> => {
  if (isTemplate(templateOrUnknown)) {
    return Promise.resolve(templateOrUnknown);
  }

  if (typeof templateOrUnknown === "string") {
    commandObj.warn(
      `Unknown template: ${color.yellow(
        templateOrUnknown
      )}. Available templates: ${TEMPLATES.join(", ")}`
    );
  }

  return selectTemplate();
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
    fileContent = await readFile(extensionsJsonPath, FS_OPTIONS);
  } catch {
    await writeFile(
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

    await writeFile(
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
    const currentGitIgnoreContent = await readFile(gitIgnorePath, FS_OPTIONS);

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

  return writeFile(gitIgnorePath, newGitIgnoreContent, FS_OPTIONS);
};

type InitArg = {
  maybeFluenceConfig?: FluenceConfig | null | undefined;
  maybeProjectPath?: string | undefined;
  template?: Template;
};

export const init = async (options: InitArg = {}): Promise<FluenceConfig> => {
  const { template = await selectTemplate(), maybeFluenceConfig } = options;

  Countly.add_event({ key: `init:template:${template}` });

  const projectPath =
    options.maybeProjectPath === undefined && !isInteractive
      ? process.cwd()
      : path.resolve(
          options.maybeProjectPath ??
            (await input({
              message:
                "Enter project path or press enter to init in the current directory:",
            }))
        );

  await mkdir(projectPath, { recursive: true });
  setProjectRootDir(projectPath);
  await writeFile(await ensureFluenceAquaServicesPath(), "", FS_OPTIONS);
  await writeFile(await ensureFluenceAquaDealPath(), "", FS_OPTIONS);
  const fluenceConfig = maybeFluenceConfig ?? (await initNewFluenceConfig());

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
  await ensureVSCodeSettingsJSON({ generateSettingsJson: true });
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

  const defaultAquaTSorJSPathRelative = path.relative(
    projectRootDir,
    defaultAquaTSorJSPath
  );

  const defaultTSorJSDirPath = isJS
    ? await ensureDefaultJSDirPath()
    : await ensureDefaultTSDirPath();

  const indexFileName = isJS ? INDEX_JS_FILE_NAME : INDEX_TS_FILE_NAME;

  const PACKAGE_JSON = {
    type: "module",
    version: "1.0.0",
    description: "",
    main: indexFileName,
    scripts: {
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
        FLUENCE_NETWORK_ENVIRONMENT_RECOMMENDED_VERSION,
      ...(isJS ? {} : { "ts-node": TS_NODE_RECOMMENDED_VERSION }),
      typescript: TYPESCRIPT_RECOMMENDED_VERSION,
    },
  } as const;

  await writeFile(
    path.join(defaultTSorJSDirPath, PACKAGE_JSON_FILE_NAME),
    JSON.stringify(PACKAGE_JSON, null, 2) + "\n",
    FS_OPTIONS
  );

  await writeFile(
    path.join(defaultTSorJSDirPath, SRC_DIR_NAME, indexFileName),
    TEMPLATE_INDEX_FILE_CONTENT,
    FS_OPTIONS
  );

  if (isJS) {
    fluenceConfig.aquaOutputJSPath = defaultAquaTSorJSPathRelative;
    fluenceConfig.appJSPath = defaultAquaTSorJSPathRelative;
  } else {
    const TS_CONFIG = {
      compilerOptions: {
        target: "es2022",
        module: "es2022",
        strict: true,
        skipLibCheck: true,
        moduleResolution: "nodenext",
      },
      "ts-node": {
        esm: true,
      },
    };

    await writeFile(
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
    message: `Installing npm dependencies for ${isJS ? "JS" : "TS"} project`,
  });
};
