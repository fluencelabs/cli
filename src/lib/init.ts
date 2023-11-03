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

import { existsSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { cwd } from "node:process";

import { color } from "@oclif/color";

import {
  initNewFluenceConfig,
  type FluenceConfig,
} from "../lib/configs/project/fluence.js";
import {
  type Template,
  FS_OPTIONS,
  RECOMMENDED_GITIGNORE_CONTENT,
  TEMPLATES,
  isTemplate,
  JS_CLIENT_NPM_DEPENDENCY,
  CLI_NAME_FULL,
  getMainAquaFileContent,
  READMEs,
} from "../lib/const.js";
import {
  ensureSrcAquaPath,
  ensureFluenceAquaServicesPath,
  ensureServicesDir,
  ensureVSCodeExtensionsJsonPath,
  getGitignorePath,
  setProjectRootDir,
  getREADMEPath,
  ensureSrcPath,
  projectRootDir,
  getPackageJSONPath,
  getTsConfigPath,
} from "../lib/paths.js";
import { confirm, input, list } from "../lib/prompt.js";
import CLIPackageJSON from "../versions/cli.package.json" assert { type: "json" };

import { addService } from "./addService.js";
import { compileToFiles } from "./aqua.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { envConfig, setEnvConfig } from "./configs/globalConfigs.js";
import { initNewEnvConfig } from "./configs/project/env.js";
import { initNewProviderConfig } from "./configs/project/provider.js";
import { initNewReadonlyServiceConfig } from "./configs/project/service.js";
import { initNewWorkersConfigReadonly } from "./configs/project/workers.js";
import { addCountlyEvent } from "./countly.js";
import { generateNewModule } from "./generateNewModule.js";
import type { ProviderConfigArgs } from "./generateUserProviderConfig.js";
import { ensureAquaImports } from "./helpers/aquaImports.js";
import { jsonStringify } from "./helpers/utils.js";
import { initMarineCli } from "./marineCli.js";
import { updateRelaysJSON, resolveFluenceEnv } from "./multiaddres.js";
import { ensureAquaMainPath, ensureSrcIndexTSorJSPath } from "./paths.js";

export const jsTemplateIndexJsContent = `/* eslint-disable */
// @ts-nocheck
import { Fluence } from "@fluencelabs/js-client";
import relays from "./relays.json" assert { type: "json" };

import {
  helloWorld,
  helloWorldRemote,
  getInfo,
  getInfos,
} from "./aqua/main.js";

await Fluence.connect(relays[0].multiaddr, {});
const helloWorldResult = await helloWorld("Fluence");
console.log(helloWorldResult);
const helloWorldRemoteResult = await helloWorldRemote("Fluence");
console.log(helloWorldRemoteResult);
const getInfoResult = await getInfo();
console.log(getInfoResult);
const getInfosResult = await getInfos(relays.map(({ peerId }) => peerId));
console.log(getInfosResult);
await Fluence.disconnect();
`;

const selectTemplate = (): Promise<Template> => {
  return list({
    message: "Select template",
    options: [...TEMPLATES],
    oneChoiceMessage: (): never => {
      throw new Error("Unreachable: only one template");
    },
    onNoChoices: (): never => {
      throw new Error("Unreachable: no templates");
    },
  });
};

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
        templateOrUnknown,
      )}. Available templates: ${TEMPLATES.join(", ")}`,
    );
  }

  return selectTemplate();
};

type InitArg = {
  maybeProjectPath?: string | undefined;
  template?: Template | undefined;
  fluenceEnvFromFlags?: string | undefined;
} & ProviderConfigArgs;

export async function init(options: InitArg = {}): Promise<FluenceConfig> {
  const projectPath =
    options.maybeProjectPath === undefined && !isInteractive
      ? process.cwd()
      : resolve(
          options.maybeProjectPath ??
            (await input({
              message:
                "Enter project path or press enter to init in the current directory",
              default: cwd(),
            })),
        );

  if (!(await shouldInit(projectPath))) {
    commandObj.error(
      `Directory ${color.yellow(
        projectPath,
      )} is not empty. Please, init in an empty directory.`,
    );
  }

  const { template = await selectTemplate() } = options;
  await addCountlyEvent(`init:template:${template}`);
  await mkdir(projectPath, { recursive: true });
  setProjectRootDir(projectPath);
  await writeFile(await ensureFluenceAquaServicesPath(), "", FS_OPTIONS);
  const fluenceConfig = await initNewFluenceConfig();
  const fluenceEnv = await resolveFluenceEnv(options.fluenceEnvFromFlags);

  if (envConfig === null) {
    setEnvConfig(await initNewEnvConfig(fluenceEnv));
  } else {
    envConfig.fluenceEnv = fluenceEnv;
    await envConfig.$commit();
  }

  if (fluenceEnv === "local") {
    console.log(template, projectRootDir);

    await initNewProviderConfig({
      numberOfNoxes: options.numberOfNoxes,
    });
  }

  await writeFile(
    await ensureAquaMainPath(),
    getMainAquaFileContent(template !== "quickstart"),
    FS_OPTIONS,
  );

  await writeFile(
    await ensureVSCodeExtensionsJsonPath(),
    jsonStringify({
      recommendations: ["redhat.vscode-yaml", "FluenceLabs.aqua"],
    }) + "\n",
    FS_OPTIONS,
  );

  await ensureAquaImports({
    generateSettingsJson: true,
    maybeFluenceConfig: fluenceConfig,
  });

  await writeFile(
    getGitignorePath(),
    RECOMMENDED_GITIGNORE_CONTENT,
    FS_OPTIONS,
  );

  const workersConfig = await initNewWorkersConfigReadonly();
  const { ensureAquaFileWithWorkerInfo } = await import("./deployWorkers.js");
  await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig);
  await writeFile(getREADMEPath(), READMEs[template], FS_OPTIONS);

  switch (template) {
    case "quickstart": {
      const serviceName = "myService";

      const absoluteServicePath = join(await ensureServicesDir(), serviceName);

      const pathToModuleDir = join(absoluteServicePath, "modules", serviceName);
      await generateNewModule(pathToModuleDir);

      await initNewReadonlyServiceConfig(
        absoluteServicePath,
        relative(absoluteServicePath, pathToModuleDir),
        serviceName,
      );

      await addService({
        serviceName,
        fluenceConfig,
        marineCli: await initMarineCli(fluenceConfig),
        absolutePathOrUrl: absoluteServicePath,
        interactive: false,
      });

      break;
    }

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

  await updateRelaysJSON({
    fluenceConfig,
    numberOfNoxes: options.numberOfNoxes,
  });

  commandObj.logToStderr(
    color.magentaBright(
      `\nSuccessfully initialized ${CLI_NAME_FULL} project template at ${projectPath}\n`,
    ),
  );

  return fluenceConfig;
}

const shouldInit = async (projectPath: string): Promise<boolean> => {
  if (!isInteractive) {
    return true;
  }

  const pathDoesNotExists = !existsSync(projectPath);

  if (pathDoesNotExists) {
    return true;
  }

  const pathIsNotADirectory = !(await stat(projectPath)).isDirectory();

  if (pathIsNotADirectory) {
    return true;
  }

  const directoryContent = await readdir(projectPath);
  const pathIsEmptyDir = directoryContent.length === 0;

  if (pathIsEmptyDir) {
    return true;
  }

  const dirHasOnlyGitInside =
    directoryContent.length === 1 && directoryContent[0] === ".git";

  if (dirHasOnlyGitInside) {
    return true;
  }

  const hasUserConfirmedInitInNonEmptyDir = await confirm({
    message: `Directory ${color.yellow(projectPath)} is not empty. Proceed?`,
  });

  if (hasUserConfirmedInitInNonEmptyDir) {
    return true;
  }

  return false;
};

type InitTSorJSProjectArg = {
  isJS: boolean;
  fluenceConfig: FluenceConfig;
};

const initTSorJSProject = async ({
  isJS,
  fluenceConfig,
}: InitTSorJSProjectArg): Promise<void> => {
  const defaultAquaTSorJSPath = await ensureSrcAquaPath();

  const defaultAquaTSorJSPathRelative = relative(
    projectRootDir,
    defaultAquaTSorJSPath,
  );

  const indexFilePath = await ensureSrcIndexTSorJSPath(isJS);
  const indexFileName = basename(indexFilePath);

  const packageJson = {
    type: "module",
    version: "1.0.0",
    main: indexFileName,
    scripts: {
      start: `node${isJS ? "" : "--loader ts-node/esm"} ${relative(
        projectRootDir,
        indexFilePath,
      )}`,
      ...(isJS ? {} : { build: "tsc -b" }),
    },
    keywords: ["fluence"],
    dependencies: {
      [JS_CLIENT_NPM_DEPENDENCY]:
        CLIPackageJSON.dependencies[JS_CLIENT_NPM_DEPENDENCY],
    },
    ...(isJS
      ? {}
      : {
          devDependencies: {
            "ts-node": CLIPackageJSON.devDependencies["ts-node"],
            typescript: CLIPackageJSON.devDependencies["typescript"],
          },
        }),
  } as const;

  await writeFile(
    getPackageJSONPath(),
    `${jsonStringify(packageJson)}\n`,
    FS_OPTIONS,
  );

  await writeFile(indexFilePath, jsTemplateIndexJsContent, FS_OPTIONS);

  fluenceConfig.relaysPath = relative(projectRootDir, await ensureSrcPath());

  if (isJS) {
    fluenceConfig.aquaOutputJSPath = defaultAquaTSorJSPathRelative;
  } else {
    const TS_CONFIG = {
      compilerOptions: {
        target: "es2022",
        module: "es2022",
        strict: true,
        skipLibCheck: true,
        moduleResolution: "nodenext",
        outDir: "dist",
      },
      "ts-node": {
        esm: true,
      },
    };

    await writeFile(
      getTsConfigPath(),
      `${jsonStringify(TS_CONFIG)}\n`,
      FS_OPTIONS,
    );

    fluenceConfig.aquaOutputTSPath = defaultAquaTSorJSPathRelative;
  }

  await fluenceConfig.$commit();

  await compileToFiles({
    compileArgs: {
      filePath: await ensureAquaMainPath(),
      imports: await ensureAquaImports({
        maybeFluenceConfig: fluenceConfig,
      }),
    },
    targetType: isJS ? "js" : "ts",
    outputPath: join(projectRootDir, defaultAquaTSorJSPathRelative),
  });
};
