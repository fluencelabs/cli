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

import assert from "node:assert";
import { access, cp, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "url";

import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { AQUA_DEPENDENCIES_DIR_NAME, FS_OPTIONS } from "./const.js";
import { type ExecPromiseArg, execPromise } from "./execPromise.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import {
  jsonStringify,
  removeProperties,
  stringifyUnknown,
} from "./helpers/utils.js";
import {
  getFluenceAquaDependenciesPackageJsonPath,
  ensureFluenceAquaDependenciesPath,
  projectRootDir,
} from "./paths.js";
import { hasKey } from "./typeHelpers.js";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const builtInAquaDependenciesDirPath = join(
  __dirname,
  "..",
  AQUA_DEPENDENCIES_DIR_NAME,
);

const commandCache: Record<string, Promise<string>> = {};

async function resolveCommand(
  executablePath: string,
  command: string,
): Promise<string> {
  const cachedCommand = commandCache[command];

  if (cachedCommand !== undefined) {
    return cachedCommand;
  }

  let resolveCommandPromise: (value: string) => void;

  commandCache[command] = new Promise((r) => {
    resolveCommandPromise = r;
  });

  try {
    await access(executablePath);
    // @ts-expect-error resolveCommandPromise is actually assigned inside the promise callback
    resolveCommandPromise(executablePath);
    return executablePath;
  } catch {
    try {
      await execPromise({ command, args: ["--version"] });
      // @ts-expect-error resolveCommandPromise is actually assigned inside the promise callback
      resolveCommandPromise(command);
      return command;
    } catch {
      commandObj.error(
        `Couldn't find ${command} executable. Tried at ${color.yellow(
          executablePath,
        )} and also tried finding ${command} in your ${color.yellow(
          "$PATH",
        )}. Please make sure ${command} is available`,
      );
    }
  }
}

export async function getLatestVersionOfNPMDependency(
  name: string,
): Promise<string> {
  try {
    const versions = await runNpm({
      args: ["view", name, "version"],
    });

    const lastVersion = versions.trim().split("\n").pop();

    assert(
      lastVersion !== undefined,
      `Couldn't find last version of your ${name} using npm. Got:\n\n${versions}`,
    );

    return lastVersion;
  } catch (error) {
    commandObj.error(
      `Failed to get latest version of ${color.yellow(
        name,
      )} from npm registry. Please make sure ${color.yellow(
        name,
      )} is spelled correctly\n${stringifyUnknown(error)}`,
    );
  }
}

export async function runNpm(args: Omit<ExecPromiseArg, "command">) {
  const nodeModulesPath = (await import("node_modules-path")).default();
  const npmExecutablePath = join(nodeModulesPath, "npm", "index.js");
  const nodeExecutablePath = join(nodeModulesPath, "..", "bin", "node");

  return execPromise({
    ...args,
    command: await resolveCommand(nodeExecutablePath, "node"),
    args: [
      await resolveCommand(npmExecutablePath, "npm"),
      ...(args.args ?? []),
    ],
  });
}

export async function npmInstallAll(fluenceConfig: FluenceConfig) {
  await updatePackageJSON(fluenceConfig);

  await runNpm({
    args: ["i"],
    options: {
      cwd: await ensureFluenceAquaDependenciesPath(),
    },
  });
}

type NpmInstallArgs = {
  fluenceConfig: FluenceConfig;
  packageNameAndVersion: string;
};

export async function npmInstall({
  fluenceConfig,
  packageNameAndVersion,
}: NpmInstallArgs) {
  await updatePackageJSON(fluenceConfig);

  const correctPackageNameAndVersion = await ensureNpmInstallArgIsCorrect(
    packageNameAndVersion,
  );

  startSpinner(
    `Installing ${color.yellow(packageNameAndVersion)} aqua dependency`,
  );

  await runNpm({
    args: ["i", correctPackageNameAndVersion],
    options: {
      cwd: await ensureFluenceAquaDependenciesPath(),
    },
  });

  const packageJSONPath = await getFluenceAquaDependenciesPackageJsonPath();

  const parsedPackageJSON = JSON.parse(
    await readFile(packageJSONPath, FS_OPTIONS),
  );

  const aquaDependencies =
    await getDependenciesFromPackageJSON(parsedPackageJSON);

  stopSpinner();

  if (aquaDependencies === null) {
    throw new Error(
      `Dependency was installed but for some reason wasn't able to get 'dependencies' property at ${color.yellow(
        packageJSONPath,
      )}. Please fix it manually. E.g. by removing ${color.yellow(
        packageJSONPath,
      )} and running install command again`,
    );
  }

  fluenceConfig.aquaDependencies = aquaDependencies;
  await fluenceConfig.$commit();

  commandObj.logToStderr(
    `${packageNameAndVersion} aqua dependency is successfully installed`,
  );
}

async function ensureNpmInstallArgIsCorrect(packageNameAndVersion: string) {
  const filePath = getFilePath(packageNameAndVersion);
  const fluenceAquaDependenciesPath = await ensureFluenceAquaDependenciesPath();

  if (filePath === undefined) {
    const packageNameAndVersionTuple = splitPackageNameAndVersion(
      packageNameAndVersion,
    );

    let [, versionToInstall] = packageNameAndVersionTuple;

    if (versionToInstall !== undefined) {
      versionToInstall = ensurePathInVersionIsCorrect(
        versionToInstall,
        fluenceAquaDependenciesPath,
      );
    }

    return [packageNameAndVersionTuple[0], versionToInstall]
      .filter(Boolean)
      .join("@");
  }

  return ensurePathInVersionIsCorrect(
    packageNameAndVersion,
    fluenceAquaDependenciesPath,
  );
}

async function updatePackageJSON(fluenceConfig: FluenceConfig) {
  const fluenceAquaDependenciesPath = await ensureFluenceAquaDependenciesPath();

  const dependenciesWithFixedRelativePath = Object.fromEntries(
    Object.entries(fluenceConfig.aquaDependencies).map(
      ([packageName, version]) => {
        return [
          packageName,
          ensurePathInVersionIsCorrect(version, fluenceAquaDependenciesPath),
        ];
      },
    ),
  );

  await writeFile(
    await getFluenceAquaDependenciesPackageJsonPath(),
    jsonStringify({ dependencies: dependenciesWithFixedRelativePath }),
    FS_OPTIONS,
  );
}

async function getDependenciesFromPackageJSON(parsedPackageJSON: unknown) {
  if (
    !hasKey("dependencies", parsedPackageJSON) ||
    typeof parsedPackageJSON.dependencies !== "object" ||
    parsedPackageJSON.dependencies === null
  ) {
    return null;
  }

  const dependenciesWithVersions = Object.entries(
    parsedPackageJSON.dependencies,
  );

  if (
    !dependenciesWithVersions.every((a): a is [string, string] => {
      return typeof a[1] === "string";
    })
  ) {
    return null;
  }

  const fluenceAquaDependenciesPath = await ensureFluenceAquaDependenciesPath();

  return Object.fromEntries(
    dependenciesWithVersions.map(([packageName, version]) => {
      return [
        packageName,
        ensurePathInVersionIsCorrect(
          version,
          fluenceAquaDependenciesPath,
          true,
        ),
      ];
    }),
  );
}

function getFilePath(version: string) {
  const [, filePath] = [...(version.match(/^file:(.+)$/) ?? [])];
  return filePath;
}

function ensurePathInVersionIsCorrect(
  version: string,
  fluenceAquaDependenciesPath: string,
  isBackToFluenceYAML: boolean = false,
) {
  const filePath = getFilePath(version);

  if (filePath === undefined) {
    return version;
  }

  let [pathA, pathB] = [projectRootDir, fluenceAquaDependenciesPath];

  if (isBackToFluenceYAML) {
    [pathA, pathB] = [pathB, pathA];
  }

  return `file:${relative(pathB, resolve(pathA, filePath))}`;
}

type NpmUninstallArgs = {
  packageName: string;
  fluenceConfig: FluenceConfig;
};

export async function npmUninstall({
  packageName,
  fluenceConfig,
}: NpmUninstallArgs) {
  await runNpm({
    args: ["uninstall", packageName],
    options: {
      cwd: await ensureFluenceAquaDependenciesPath(),
    },
  });

  fluenceConfig.aquaDependencies = removeProperties(
    fluenceConfig.aquaDependencies,
    ([p]) => {
      return p === packageName;
    },
  );

  await fluenceConfig.$commit();
}

export async function copyDefaultDependencies() {
  return cp(
    builtInAquaDependenciesDirPath,
    await ensureFluenceAquaDependenciesPath(),
    { recursive: true },
  );
}

export function splitPackageNameAndVersion(
  packageNameAndMaybeVersion: string,
): [string] | [string, string] {
  const hasVersion = /.+@.+/.test(packageNameAndMaybeVersion);

  if (!hasVersion) {
    const packageName = packageNameAndMaybeVersion;

    return [packageName];
  }

  const packageNameAndVersionArray = packageNameAndMaybeVersion.split("@");
  const version = packageNameAndVersionArray.pop();
  assert(version !== undefined);
  const packageName = packageNameAndVersionArray.join("@");

  return [packageName, version];
}
