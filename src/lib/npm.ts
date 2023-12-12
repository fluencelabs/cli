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

import { access, cp } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "url";

import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import { AQUA_DEPENDENCIES_DIR_NAME } from "./const.js";
import { type ExecPromiseArg, execPromise } from "./execPromise.js";
import { ensureFluenceAquaDependenciesPath } from "./paths.js";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const aquaDependenciesDirPath = join(
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

async function runNpm(args: Omit<ExecPromiseArg, "command">) {
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

type NpmInstallArgs = {
  cwd?: string | undefined;
  packageNameAndVersion?: string | undefined;
};

export async function npmInstall({
  cwd,
  packageNameAndVersion,
}: NpmInstallArgs = {}) {
  return await runNpm({
    args: [
      "i",
      ...(packageNameAndVersion === undefined ? [] : [packageNameAndVersion]),
    ],
    options: {
      cwd: cwd ?? (await ensureFluenceAquaDependenciesPath()),
    },
  });
}

export async function copyDefaultDependencies() {
  return cp(
    aquaDependenciesDirPath,
    await ensureFluenceAquaDependenciesPath(),
    { recursive: true },
  );
}
