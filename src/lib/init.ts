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
import { join, relative, resolve } from "node:path";

import type { Node } from "@fluencelabs/fluence-network-environment";
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
  PACKAGE_JSON_FILE_NAME,
  INDEX_JS_FILE_NAME,
  INDEX_TS_FILE_NAME,
  SRC_DIR_NAME,
  TS_CONFIG_FILE_NAME,
  JS_CLIENT_NPM_DEPENDENCY,
  FLUENCE_NETWORK_ENVIRONMENT_NPM_DEPENDENCY,
  CLI_NAME_FULL,
  getMainAquaFileContent,
  READMEs,
} from "../lib/const.js";
import {
  ensureDefaultAquaJSPath,
  ensureDefaultAquaTSPath,
  ensureDefaultJSDirPath,
  ensureDefaultTSDirPath,
  ensureFluenceAquaServicesPath,
  ensureSrcServicesDir,
  ensureVSCodeExtensionsJsonPath,
  getGitignorePath,
  projectRootDir,
  setProjectRootDir,
  getREADMEPath,
} from "../lib/paths.js";
import { confirm, input, list } from "../lib/prompt.js";
import CLIPackageJSON from "../versions/cli.package.json" assert { type: "json" };
import versions from "../versions.json" assert { type: "json" };

import { addService } from "./addService.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { setEnvConfig } from "./configs/globalConfigs.js";
import { initNewEnvConfig } from "./configs/project/env.js";
import { initNewReadonlyServiceConfig } from "./configs/project/service.js";
import { initNewWorkersConfig } from "./configs/project/workers.js";
import type { ContractsENV } from "./const.js";
import { addCountlyEvent } from "./countly.js";
import { generateNewModule } from "./generateNewModule.js";
import { ensureAquaImports } from "./helpers/aquaImports.js";
import { jsonStringify } from "./helpers/utils.js";
import { initMarineCli } from "./marineCli.js";
import {
  ensureCustomRelays,
  resolveFluenceEnv,
  local,
  multiaddrsToNodes,
} from "./multiaddres.js";
import { ensureSrcAquaMainPath } from "./paths.js";

const DISABLE_TS_AND_ES_LINT = `/* eslint-disable */
// @ts-nocheck`;

const NODES_CONST = "nodes";

const getPeersImportStatement = (peersToImport: string): string => {
  return `import { ${peersToImport} as ${NODES_CONST} } from "@fluencelabs/fluence-network-environment";`;
};

const getCustomPeers = (peers: Node[]) => {
  return `const ${NODES_CONST} = ${jsonStringify(peers)}`;
};

const getPeersImportInJS = (
  fluenceEnvOrCustomRelays: ContractsENV | Array<string>,
) => {
  if (Array.isArray(fluenceEnvOrCustomRelays)) {
    return getCustomPeers(multiaddrsToNodes(fluenceEnvOrCustomRelays));
  }

  return {
    kras: getPeersImportStatement("krasnodar"),
    stage: getPeersImportStatement("stage"),
    testnet: getPeersImportStatement("testNet"),
    local: getCustomPeers(local),
  }[fluenceEnvOrCustomRelays];
};

export const getJsTemplateIndexJsContent = (
  fluenceEnvOrCustomRelays: ContractsENV | Array<string>,
) => {
  return `${DISABLE_TS_AND_ES_LINT}
import { Fluence } from "@fluencelabs/js-client";
${getPeersImportInJS(fluenceEnvOrCustomRelays)}

import {
  helloWorld,
  helloWorldRemote,
  getInfo,
  getInfos,
} from "./aqua/main.js";

const peerIds = ${NODES_CONST}.map(({ peerId }) => peerId);
await Fluence.connect(${NODES_CONST}[0].multiaddr);
const helloWorldResult = await helloWorld("Fluence");
const helloWorldRemoteResult = await helloWorldRemote("Fluence");
const getInfoResult = await getInfo();
console.log(helloWorldResult);
await Fluence.disconnect()
`;
};

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
};

export async function init(options: InitArg = {}): Promise<FluenceConfig> {
  const projectPath =
    options.maybeProjectPath === undefined && !isInteractive
      ? process.cwd()
      : resolve(
          options.maybeProjectPath ??
            (await input({
              message:
                "Enter project path or press enter to init in the current directory:",
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
  setEnvConfig(await initNewEnvConfig(fluenceEnv));
  let fluenceEnvOrCustomRelays: ContractsENV | Array<string>;

  if (fluenceEnv === "custom") {
    fluenceEnvOrCustomRelays = await ensureCustomRelays(fluenceConfig);
  } else {
    fluenceEnvOrCustomRelays = fluenceEnv;
  }

  await writeFile(
    await ensureSrcAquaMainPath(),
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

  const workersConfig = await initNewWorkersConfig();

  const { ensureAquaFileWithWorkerInfo } = await import("./deployWorkers.js");
  await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig);
  await writeFile(getREADMEPath(), READMEs[template], FS_OPTIONS);

  switch (template) {
    case "quickstart": {
      const serviceName = "myService";

      const absoluteServicePath = join(
        await ensureSrcServicesDir(),
        serviceName,
      );

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
      await initTSorJSProject({
        isJS: true,
        fluenceConfig,
        fluenceEnvOrCustomRelays,
      });

      break;
    }

    case "ts": {
      await initTSorJSProject({
        isJS: false,
        fluenceConfig,
        fluenceEnvOrCustomRelays,
      });

      break;
    }

    default: {
      const _exhaustiveCheck: never = template;
      return _exhaustiveCheck;
    }
  }

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
  fluenceEnvOrCustomRelays: ContractsENV | Array<string>;
  isJS: boolean;
  fluenceConfig: FluenceConfig;
};

const initTSorJSProject = async ({
  fluenceEnvOrCustomRelays,
  isJS,
  fluenceConfig,
}: InitTSorJSProjectArg): Promise<void> => {
  const defaultAquaTSorJSPath = isJS
    ? await ensureDefaultAquaJSPath()
    : await ensureDefaultAquaTSPath();

  const defaultAquaTSorJSPathRelative = relative(
    projectRootDir,
    defaultAquaTSorJSPath,
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
      start: `${isJS ? "node" : "ts-node"} ${join(
        SRC_DIR_NAME,
        indexFileName,
      )}`,
      ...(isJS ? {} : { build: "tsc -b" }),
    },
    keywords: ["fluence"],
    author: "",
    license: "ISC",
    dependencies: {
      [JS_CLIENT_NPM_DEPENDENCY]: versions.npm[JS_CLIENT_NPM_DEPENDENCY],
      [FLUENCE_NETWORK_ENVIRONMENT_NPM_DEPENDENCY]:
        versions.npm[FLUENCE_NETWORK_ENVIRONMENT_NPM_DEPENDENCY],
      ...(isJS
        ? {}
        : {
            "ts-node": CLIPackageJSON.devDependencies["ts-node"],
            typescript: CLIPackageJSON.devDependencies["typescript"],
          }),
    },
  } as const;

  await writeFile(
    join(defaultTSorJSDirPath, PACKAGE_JSON_FILE_NAME),
    JSON.stringify(PACKAGE_JSON, null, 2) + "\n",
    FS_OPTIONS,
  );

  await writeFile(
    join(defaultTSorJSDirPath, SRC_DIR_NAME, indexFileName),
    getJsTemplateIndexJsContent(fluenceEnvOrCustomRelays),
    FS_OPTIONS,
  );

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
      join(defaultTSorJSDirPath, TS_CONFIG_FILE_NAME),
      jsonStringify(TS_CONFIG),
      FS_OPTIONS,
    );

    fluenceConfig.aquaOutputTSPath = defaultAquaTSorJSPathRelative;
  }

  await fluenceConfig.$commit();
};
