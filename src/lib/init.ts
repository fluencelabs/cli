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
  CLI_NAME_FULL,
  getMainAquaFileContent,
  READMEs,
  JS_CLIENT_NPM_DEPENDENCY,
} from "../lib/const.js";
import {
  ensureFrontendCompiledAquaPath,
  ensureFluenceAquaServicesPath,
  ensureServicesDir,
  ensureVSCodeExtensionsJsonPath,
  getGitignorePath,
  setProjectRootDir,
  getREADMEPath,
  projectRootDir,
  getPackageJSONPath,
  getFrontendSrcPath,
  getFrontendCompiledAquaPath,
  getIndexHTMLPath,
  getTsConfigPath,
  getFrontendPath,
} from "../lib/paths.js";
import { confirm, input, list } from "../lib/prompt.js";
import CLIPackageJSON from "../versions/cli.package.json" assert { type: "json" };

import { addService } from "./addService.js";
import { compileToFiles } from "./aqua.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { envConfig, setEnvConfig } from "./configs/globalConfigs.js";
import { initNewEnvConfig } from "./configs/project/env.js";
import { initNewReadonlyProviderConfig } from "./configs/project/provider.js";
import { initNewReadonlyServiceConfig } from "./configs/project/service.js";
import { initNewWorkersConfigReadonly } from "./configs/project/workers.js";
import { SERVICE_INTERFACE_FILE_HEADER } from "./const.js";
import { addCountlyEvent } from "./countly.js";
import { generateNewModule } from "./generateNewModule.js";
import type { ProviderConfigArgs } from "./generateUserProviderConfig.js";
import { getAquaImports } from "./helpers/aquaImports.js";
import { jsonStringify } from "./helpers/utils.js";
import { initMarineCli } from "./marineCli.js";
import { updateRelaysJSON, resolveFluenceEnv } from "./multiaddres.js";
import { copyDefaultDependencies } from "./npm.js";
import { getFrontendIndexTSorJSPath, ensureAquaMainPath } from "./paths.js";

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
  env?: string | undefined;
} & Omit<ProviderConfigArgs, "env" | "name">;

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

  await writeFile(
    await ensureFluenceAquaServicesPath(),
    `${SERVICE_INTERFACE_FILE_HEADER}\n`,
    FS_OPTIONS,
  );

  const fluenceConfig = await initNewFluenceConfig();
  await copyDefaultDependencies();
  const fluenceEnv = await resolveFluenceEnv(options.env);

  if (envConfig === null) {
    setEnvConfig(await initNewEnvConfig(fluenceEnv));
  } else {
    envConfig.fluenceEnv = fluenceEnv;
    await envConfig.$commit();
  }

  if (fluenceEnv === "local") {
    await initNewReadonlyProviderConfig({
      env: "local",
      noxes: options.noxes,
    });
  }

  await writeFile(
    await ensureAquaMainPath(),
    getMainAquaFileContent(template === "minimal"),
    FS_OPTIONS,
  );

  await writeFile(
    await ensureVSCodeExtensionsJsonPath(),
    jsonStringify({
      recommendations: ["redhat.vscode-yaml", "FluenceLabs.aqua"],
    }) + "\n",
    FS_OPTIONS,
  );

  await writeFile(
    getGitignorePath(),
    RECOMMENDED_GITIGNORE_CONTENT,
    FS_OPTIONS,
  );

  const workersConfig = await initNewWorkersConfigReadonly();
  const { ensureAquaFileWithWorkerInfo } = await import("./deployWorkers.js");
  await ensureAquaFileWithWorkerInfo(workersConfig, fluenceConfig, fluenceEnv);
  await writeFile(getREADMEPath(), READMEs[template], FS_OPTIONS);

  switch (template) {
    case "minimal":
      break;

    case "quickstart": {
      await quickstart();
      break;
    }

    case "js": {
      await quickstart();
      await initTSorJSProject({ isJS: true, fluenceConfig });
      break;
    }

    case "ts": {
      await quickstart();
      await initTSorJSProject({ isJS: false, fluenceConfig });
      break;
    }

    default: {
      const _exhaustiveCheck: never = template;
      return _exhaustiveCheck;
    }
  }

  async function quickstart() {
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
  }

  await updateRelaysJSON({
    fluenceConfig,
    noxes: options.noxes,
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

async function initTSorJSProject({
  isJS,
  fluenceConfig,
}: InitTSorJSProjectArg): Promise<void> {
  const frontendCompiledAquaPath = await ensureFrontendCompiledAquaPath();
  const indexFilePath = getFrontendIndexTSorJSPath(isJS);
  const packageJSONPath = getPackageJSONPath();
  const frontendSrcPath = getFrontendSrcPath();
  fluenceConfig.relaysPath = relative(projectRootDir, frontendSrcPath);

  const relativeFrontendCompiledAquaPath = relative(
    projectRootDir,
    frontendCompiledAquaPath,
  );

  fluenceConfig[isJS ? "aquaOutputJSPath" : "aquaOutputTSPath"] =
    relativeFrontendCompiledAquaPath;

  await Promise.all([
    fluenceConfig.$commit(),
    writeFile(indexFilePath, getIndexJsContent(isJS), FS_OPTIONS),
    writeFile(packageJSONPath, jsonStringify(getPackageJSON(isJS)), FS_OPTIONS),
    writeFile(getIndexHTMLPath(), getIndexHTMLContent(isJS), FS_OPTIONS),
    isJS
      ? Promise.resolve()
      : writeFile(getTsConfigPath(), TS_CONFIG_CONTENT, FS_OPTIONS),

    (async () => {
      return compileToFiles({
        compileArgs: {
          filePath: await ensureAquaMainPath(),
          imports: await getAquaImports({
            maybeFluenceConfig: fluenceConfig,
          }),
        },
        targetType: isJS ? "js" : "ts",
        outputPath: frontendCompiledAquaPath,
      });
    })(),
  ]);
}

function getIndexHTMLContent(isJS: boolean) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link
      rel="icon"
      href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgc3R5bGU9ImZpbGw6bm9uZSI+PHBhdGggZD0iTTE3LjI3NyAwaC0yLjQzNHY1LjM1NGMtNS4zNy41NzctOS41NSA1LjEyMy05LjU1IDEwLjY0NiAwIDUuNTIzIDQuMTggMTAuMDcgOS41NSAxMC42NDZWMzJoMi40MzR2LTUuMzY4YzUuMzEtLjYzMiA5LjQzLTUuMTUgOS40My0xMC42MzIgMC01LjQ4MS00LjEyLTEwLTkuNDMtMTAuNjMyek03LjcyNiAxNmE4LjI3NiA4LjI3NiAwIDAgMSA3LjExOS04LjE5NHYxNi4zODhBOC4yNzYgOC4yNzYgMCAwIDEgNy43MjYgMTZabTE2LjU0OCAwYTguMjc2IDguMjc2IDAgMCAxLTYuOTk2IDguMTc2VjcuODI0QTguMjc2IDguMjc2IDAgMCAxIDI0LjI3MyAxNloiIHN0eWxlPSJjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNlNDFjNWM7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQiLz48L3N2Zz4="
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fluence</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/${relative(
      getFrontendPath(),
      getFrontendIndexTSorJSPath(isJS),
    )}"></script>
  </body>
</html>
`;
}

function getIndexJsContent(isJS: boolean) {
  return `import { Fluence } from "@fluencelabs/js-client";
import relays from "./relays.json" assert { type: "json" };
import {
  helloWorld,
  helloWorldRemote,
  runDeployedServices,
  showSubnet,
} from "./${relative(
    getFrontendSrcPath(),
    join(getFrontendCompiledAquaPath(), "main.js"),
  )}";

const appEl =
  document.querySelector("#app") ??
  (() => {
    throw new Error("#app element is not found");
  })();

const aquaFunctions = [
  {
    name: "helloWorld",
    fn() {
      return helloWorld("Fluence");
    },
  },
  {
    name: "helloWorldRemote",
    fn() {
      return helloWorldRemote("Fluence");
    },
  },
  {
    name: "showSubnet",
    fn() {
      return showSubnet();
    },
  },
  {
    name: "runDeployedServices",
    fn() {
      return runDeployedServices();
    },
  },
];

(async () => {
  const p = document.createElement("p");
  p.innerText = "Loading...";
  appEl.append(p);
  try {
    await Fluence.connect(relays[0].multiaddr);
  } catch (error) {
    p.style.color = "red";
    p.innerText = \`❌ \${stringifyError(error)}\`;
    throw error;
  }

  p.remove();

  aquaFunctions.forEach((aquaFn) => {
    const buttonEl = document.createElement("button");
    buttonEl.innerText = aquaFn.name;

    buttonEl.addEventListener("click", () => {
      runAquaFunction(aquaFn);
    });

    appEl.append(buttonEl);
  });
})();

${
  isJS
    ? ""
    : `type AquaFunction = {
  name: string;
  fn: () => Promise<unknown>;
};
`
}
async function runAquaFunction({ fn, name }${isJS ? "" : ": AquaFunction"}) {
  const p = document.createElement("p");
  p.style.whiteSpace = "pre-wrap";
  try {
    const res = await fn();
    p.style.color = "green";
    p.innerHTML = \`\${name}: ✅ \${JSON.stringify(res, null, 2)}\`;
  } catch (e) {
    p.style.color = "red";
    p.innerHTML = \`\${name}: ❌ \${stringifyError(e)}\`;
  }
  appEl.append(p);
}

function stringifyError(e${isJS ? "" : ": unknown"}) {
  if (e instanceof Error) {
    return e.message;
  }

  if (e instanceof Object) {
    const message = JSON.stringify(e, null, 2);
    if (message.includes("[0].dealIdOriginal")) {
      return "Please, make sure you have deployed the service";
    }

    return JSON.stringify(e, null, 2);
  }

  return String(e);
}
`;
}

const TS_CONFIG_CONTENT = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;

function getPackageJSON(isJS: boolean) {
  return {
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: `${isJS ? "" : "tsc && "}vite build`,
      preview: "vite preview",
    },
    dependencies: {
      [JS_CLIENT_NPM_DEPENDENCY]:
        CLIPackageJSON.dependencies[JS_CLIENT_NPM_DEPENDENCY],
    },
    devDependencies: {
      vite: "4.4.5",
      ...(isJS ? {} : { typescript: "5.0.2" }),
    },
  };
}
