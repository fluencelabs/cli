/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import assert from "node:assert";
import { access, cp, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "url";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import { jsonStringify } from "../common.js";

import { ajv } from "./ajvInstance.js";
import { commandObj } from "./commandObj.js";
import { AQUA_DEPENDENCIES_DIR_NAME, FS_OPTIONS } from "./const.js";
import { type ExecPromiseArg, execPromise } from "./execPromise.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { stringifyUnknown } from "./helpers/stringifyUnknown.js";
import { removeProperties } from "./helpers/utils.js";
import {
  getFluenceAquaDependenciesPackageJsonPath,
  ensureFluenceAquaDependenciesPath,
  projectRootDir,
} from "./paths.js";
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

export async function npmInstallAll() {
  await updatePackageJSON();

  await runNpm({
    args: ["i"],
    options: {
      cwd: await ensureFluenceAquaDependenciesPath(),
    },
  });
}

export async function npmInstall(packageNameAndVersion: string) {
  const fluenceConfig = await ensureFluenceProject();
  await updatePackageJSON();

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

  const aquaDependencies = await getDependenciesFromPackageJSON(
    parsedPackageJSON,
    packageJSONPath,
  );

  stopSpinner();

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

async function updatePackageJSON() {
  const fluenceConfig = await ensureFluenceProject();
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
    `${jsonStringify({ dependencies: dependenciesWithFixedRelativePath })}\n`,
    FS_OPTIONS,
  );
}

type PackageJSON = {
  dependencies: Record<string, string>;
};

const packageJSONSchema: JSONSchemaType<PackageJSON> = {
  type: "object",
  properties: {
    dependencies: {
      type: "object",
      additionalProperties: {
        type: "string",
      },
      required: [],
    },
  },
  required: ["dependencies"],
};

const validatePackageJSON = ajv.compile(packageJSONSchema);

async function getDependenciesFromPackageJSON(
  parsedPackageJSON: unknown,
  packageJSONPath: string,
) {
  if (!validatePackageJSON(parsedPackageJSON)) {
    throw new Error(
      `Dependency was installed but for some reason wasn't able to get 'dependencies' property at ${color.yellow(
        packageJSONPath,
      )}. Please fix it manually, e.g. by removing ${color.yellow(
        packageJSONPath,
      )} and running install command again`,
    );
  }

  const fluenceAquaDependenciesPath = await ensureFluenceAquaDependenciesPath();

  return Object.fromEntries(
    Object.entries(parsedPackageJSON.dependencies).map(
      ([packageName, version]) => {
        return [
          packageName,
          ensurePathInVersionIsCorrect(
            version,
            fluenceAquaDependenciesPath,
            true,
          ),
        ];
      },
    ),
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

  if (filePath === undefined || isAbsolute(filePath)) {
    return version;
  }

  let [pathA, pathB] = [projectRootDir, fluenceAquaDependenciesPath];

  if (isBackToFluenceYAML) {
    [pathA, pathB] = [pathB, pathA];
  }

  const absoluteDependencyPath = resolve(pathA, filePath);
  // generate the correct relative path
  // because fluence.yaml and package.json are in different directories
  // relative paths must be updated to be correct both when writing from
  // fluence.yaml to package.json and vice versa
  const newRelativeDependencyPath = relative(pathB, absoluteDependencyPath);
  return `file:${newRelativeDependencyPath}`;
}

export async function npmUninstall(packageName: string) {
  const fluenceConfig = await ensureFluenceProject();

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
