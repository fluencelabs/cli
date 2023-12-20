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
import { access, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "url";

import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  AQUA_DEPENDENCIES_DIR_NAME,
  FS_OPTIONS,
  FLUENCE_CONFIG_FULL_FILE_NAME,
} from "./const.js";
import { type ExecPromiseArg, execPromise } from "./execPromise.js";
import { splitPackageNameAndVersion } from "./helpers/package.js";
import {
  jsonStringify,
  removeProperties,
  stringifyUnknown,
} from "./helpers/utils.js";
import {
  getFluenceAquaDependenciesPackageJsonPath,
  ensureFluenceAquaDependenciesPath,
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

function assertDependenciesPresent(
  fluenceConfig: FluenceConfig,
): asserts fluenceConfig is FluenceConfig & {
  dependencies: { npm: Record<string, string> };
} {
  assert(
    fluenceConfig.dependencies?.npm,
    `Unreachable. CLI now makes sure that dependencies are always present in ${color.yellow(
      "initCLI",
    )} function inside each command in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
  );
}

type NpmInstallArgs = {
  fluenceConfig: FluenceConfig;
  packageNameAndVersion?: string | undefined;
};

export async function npmInstall({
  fluenceConfig,
  packageNameAndVersion,
}: NpmInstallArgs) {
  assertDependenciesPresent(fluenceConfig);

  if (packageNameAndVersion === undefined) {
    await writeFile(
      await getFluenceAquaDependenciesPackageJsonPath(),
      jsonStringify({ dependencies: fluenceConfig.dependencies.npm }),
      FS_OPTIONS,
    );

    await runNpm({
      args: ["i"],
      options: {
        cwd: await ensureFluenceAquaDependenciesPath(),
      },
    });

    return;
  }

  const packageNameAndVersionTuple = splitPackageNameAndVersion(
    packageNameAndVersion,
  );

  const [packageName] = packageNameAndVersionTuple;
  let [, version] = packageNameAndVersionTuple;

  if (version === undefined) {
    version = await getLatestVersionOfNPMDependency(packageName);
  }

  await runNpm({
    args: ["i", packageNameAndVersion],
    options: {
      cwd: await ensureFluenceAquaDependenciesPath(),
    },
  });

  fluenceConfig.dependencies.npm[packageName] = version;
  await fluenceConfig.$commit();
}

type NpmUninstallArgs = {
  packageNameAndVersion: string;
  fluenceConfig: FluenceConfig;
};

export async function npmUninstall({
  packageNameAndVersion,
  fluenceConfig,
}: NpmUninstallArgs) {
  assertDependenciesPresent(fluenceConfig);
  const [packageName] = splitPackageNameAndVersion(packageNameAndVersion);

  await runNpm({
    args: ["uninstall", packageNameAndVersion],
    options: {
      cwd: await ensureFluenceAquaDependenciesPath(),
    },
  });

  fluenceConfig.dependencies.npm = removeProperties(
    fluenceConfig.dependencies.npm,
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
