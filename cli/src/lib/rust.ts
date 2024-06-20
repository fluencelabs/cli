/**
 * Copyright 2024 Fluence DAO
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

import { rm, mkdir, rename } from "fs/promises";
import { access } from "node:fs/promises";
import { arch, homedir, platform } from "node:os";
import { join } from "node:path";

import { color } from "@oclif/color";

import { jsonStringify } from "../common.js";
import { versions } from "../versions.js";

import { commandObj } from "./commandObj.js";
import { initFluenceConfig } from "./configs/project/fluence.js";
import {
  RUST_WASM32_WASI_TARGET,
  isMarineOrMrepl,
  type MarineOrMrepl,
} from "./const.js";
import { addCountlyLog } from "./countly.js";
import { findEntryInPATH, prependEntryToPATH } from "./env.js";
import { execPromise } from "./execPromise.js";
import { downloadFile } from "./helpers/downloadFile.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { isExactVersion } from "./helpers/validations.js";
import {
  projectRootDir,
  ensureUserFluenceCargoDir,
  ensureUserFluenceTmpCargoDir,
} from "./paths.js";

const CARGO = "cargo";
const RUSTUP = "rustup";

const ensureRust = async (): Promise<void> => {
  if (!(await isRustInstalled())) {
    if (commandObj.config.windows) {
      commandObj.error(
        "Rust needs to be installed. Please visit https://www.rust-lang.org/tools/install for installation instructions",
      );
    }

    await execPromise({
      command: "curl",
      args: "--proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --quiet -y".split(
        " ",
      ),
      options: {
        shell: true,
      },
      spinnerMessage: "Installing Rust",
      printOutput: true,
    });

    if (!(await isRustInstalled())) {
      commandObj.error(
        `Installed rust without errors but ${color.yellow(
          RUSTUP,
        )} or ${color.yellow(
          CARGO,
        )} not in PATH. Try restarting your terminal, check if ${color.yellow(
          RUSTUP,
        )} and ${color.yellow(
          CARGO,
        )} are installed and if they are - run the command again`,
      );
    }
  }

  if (!(await hasRequiredRustToolchain())) {
    await execPromise({
      command: RUSTUP,
      args: ["install", versions["rust-toolchain"]],
      spinnerMessage: `Installing ${color.yellow(
        versions["rust-toolchain"],
      )} rust toolchain`,
      printOutput: true,
    });

    if (!(await hasRequiredRustToolchain())) {
      commandObj.error(
        `Not able to install ${color.yellow(
          versions["rust-toolchain"],
        )} rust toolchain`,
      );
    }
  }

  if (!(await hasRequiredRustTarget())) {
    await execPromise({
      command: RUSTUP,
      args: ["target", "add", RUST_WASM32_WASI_TARGET],
      spinnerMessage: `Adding ${color.yellow(
        RUST_WASM32_WASI_TARGET,
      )} rust target`,
      printOutput: true,
    });

    if (!(await hasRequiredRustTarget())) {
      commandObj.error(
        `Not able to install ${color.yellow(
          RUST_WASM32_WASI_TARGET,
        )} rust target`,
      );
    }
  }
};

async function isRustInstalled(): Promise<boolean> {
  if (await isRustInstalledCheck()) {
    return true;
  }

  const cargoPath = join(homedir(), ".cargo", "bin");

  if (!findEntryInPATH(cargoPath)) {
    // try updating PATH to include cargo
    prependEntryToPATH(cargoPath);
    return isRustInstalledCheck();
  }

  return false;
}

async function isRustInstalledCheck() {
  try {
    await Promise.all([
      execPromise({
        command: CARGO,
        args: ["--version"],
      }),
      execPromise({
        command: RUSTUP,
        args: ["--version"],
      }),
    ]);

    return true;
  } catch {
    return false;
  }
}

const regExpRecommendedToolchain = new RegExp(
  `^${versions["rust-toolchain"]}.*\\(override\\)$`,
  "gm",
);

const hasRequiredRustToolchain = async (): Promise<boolean> => {
  const toolChainList = await execPromise({
    command: RUSTUP,
    args: ["toolchain", "list"],
    options: {
      cwd: projectRootDir,
    },
  });

  const hasRequiredRustToolchain = toolChainList.includes(
    versions["rust-toolchain"],
  );

  if (
    hasRequiredRustToolchain &&
    !regExpRecommendedToolchain.test(toolChainList)
  ) {
    await execPromise({
      command: RUSTUP,
      args: ["override", "set", versions["rust-toolchain"]],
      options: {
        cwd: projectRootDir,
      },
    });
  }

  return hasRequiredRustToolchain;
};

const hasRequiredRustTarget = async (): Promise<boolean> => {
  return (
    await execPromise({
      command: RUSTUP,
      args: ["target", "list", "--installed"],
    })
  ).includes(RUST_WASM32_WASI_TARGET);
};

async function getLatestVersionOfCargoDependency(
  name: string,
): Promise<string> {
  await ensureRust();

  return (
    (
      await execPromise({
        command: CARGO,
        args: ["search", name, "--limit", "1"],
      })
    ).split('"')[1] ??
    commandObj.error(
      `Not able to find the latest version of ${color.yellow(
        name,
      )}. Please make sure ${color.yellow(name)} is spelled correctly`,
    )
  ).trim();
}

type InstallCargoDependencyArg = {
  toolchain: string | undefined;
  name: string;
  version: string;
  dependencyTmpDirPath: string;
  dependencyDirPath: string;
};

async function installCargoDependency({
  toolchain,
  name,
  version,
  dependencyDirPath,
  dependencyTmpDirPath,
}: InstallCargoDependencyArg) {
  await ensureRust();

  await execPromise({
    command: CARGO,
    args: [
      ...(typeof toolchain === "string" ? [`+${toolchain}`] : []),
      "install",
      name,
    ],
    flags: {
      version,
      root: dependencyTmpDirPath,
    },
    spinnerMessage: `Installing ${name}@${version} using cargo to ${dependencyDirPath}`,
    printOutput: true,
  });
}

type TryDownloadingBinaryArg = {
  name: MarineOrMrepl;
  version: string;
  dependencyDirPath: string;
};

/**
 * Attempts to download pre-built binary from github releases
 * @return true if binary was downloaded successfully and is working. Otherwise returns error message
 */
async function tryDownloadingBinary({
  name,
  version,
  dependencyDirPath,
}: TryDownloadingBinaryArg): Promise<string | true> {
  const binaryPath = join(dependencyDirPath, "bin", name);

  try {
    await access(binaryPath);
    // if binary is already downloaded we assume it is working
    return true;
  } catch {}

  const platformToUse = platform();

  if (
    !(
      (["darwin", "linux"].includes(platformToUse) && arch() === "x64") ||
      // works using rosetta
      (platformToUse === "darwin" && arch() === "arm64")
    )
  ) {
    return 'Pre-built binaries are only available for "x64" linux and macos platforms';
  }

  const url = `https://github.com/fluencelabs/marine/releases/download/${name}-v${version}/${name}-${platformToUse}-x86_64`;

  startSpinner(`Downloading ${name}@${version} binary to ${dependencyDirPath}`);

  try {
    await downloadFile(binaryPath, url);
    stopSpinner();
  } catch (e) {
    stopSpinner("failed");
    const error = e instanceof Error ? e.message : jsonStringify(e);
    return `Failed to download ${name}@${version} from ${url}. Error: ${error}`;
  }

  try {
    await execPromise({
      command: "chmod",
      args: ["+x", binaryPath],
    });
  } catch {
    return `Failed to make ${name}@${version} executable by running chmod +x '${binaryPath}'`;
  }

  try {
    // check binary is working
    const helpText = await execPromise({
      command: binaryPath,
      args: ["--help"],
    });

    if (!helpText.includes(version)) {
      return `Downloaded ${name}@${version} binary at ${binaryPath} --help message does not contain the ${version} version it is supposed to contain:\n result of --help execution is: ${helpText}`;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes(version)) {
      return true;
    }

    return `Failed to run ${name}@${version} binary at ${binaryPath}`;
  }

  return true;
}

type CargoDependencyArg = {
  name: MarineOrMrepl;
  version?: string | undefined;
  toolchain?: string | undefined;
};

export async function ensureMarineOrMreplDependency({
  name,
  version: versionFromArgs,
  toolchain: toolchainFromArgs,
}: CargoDependencyArg): Promise<string> {
  const version =
    (await resolveVersionToInstall({
      name,
      version: versionFromArgs,
    })) ?? (await getLatestVersionOfCargoDependency(name));

  const toolchain =
    toolchainFromArgs ??
    (name in versions.cargo ? versions["rust-toolchain"] : undefined);

  const { dependencyDirPath, dependencyTmpDirPath } =
    await resolveDependencyDirPathAndTmpPath({ name, version });

  const errorMessage = await tryDownloadingBinary({
    name,
    version,
    dependencyDirPath,
  });

  if (typeof errorMessage === "string") {
    commandObj.warn(errorMessage);

    await installUsingCargo({
      dependencyDirPath,
      dependencyTmpDirPath,
      name,
      version,
      toolchain,
    });
  }

  const hasInstalledNotDefaultVersion = version !== versions.cargo[name];
  const fluenceConfig = await initFluenceConfig();

  const hasInstalledDefaultVersionButPreviouslyNotDefaultVersionWasUsed =
    fluenceConfig?.[`${name}Version`] !== undefined &&
    version === versions.cargo[name];

  if (
    fluenceConfig !== null &&
    (hasInstalledNotDefaultVersion ||
      hasInstalledDefaultVersionButPreviouslyNotDefaultVersionWasUsed)
  ) {
    fluenceConfig[`${name}Version`] = version;
    await fluenceConfig.$commit();
  }

  await addCountlyLog(`Using ${name}@${version} cargo dependency`);
  return dependencyDirPath;
}

export async function ensureMarineAndMreplDependencies(): Promise<void> {
  for (const [name, version] of await resolveMarineAndMreplDependencies()) {
    // Not installing dependencies in parallel
    // for cargo logs to be clearly readable
    await ensureMarineOrMreplDependency({ name, version });
  }
}

type ResolveVersionArg = {
  name: string;
  version: string | undefined;
};

async function resolveVersionToInstall({
  name,
  version,
}: ResolveVersionArg): Promise<string | undefined> {
  if (typeof version === "string") {
    return (await isExactVersion(version)) ? version : undefined;
  }

  const fluenceConfig = await initFluenceConfig();
  return isMarineOrMrepl(name)
    ? fluenceConfig?.[`${name}Version`] ?? versions.cargo[name]
    : undefined;
}

export async function resolveMarineAndMreplDependencies() {
  const fluenceConfig = await initFluenceConfig();

  return [
    ["marine", fluenceConfig?.marineVersion ?? versions.cargo.marine],
    ["mrepl", fluenceConfig?.mreplVersion ?? versions.cargo.mrepl],
  ] as const;
}

type ResolveDependencyDirPathAndTmpPath = {
  name: string;
  version: string;
};

export async function resolveDependencyDirPathAndTmpPath({
  name,
  version,
}: ResolveDependencyDirPathAndTmpPath): Promise<{
  dependencyTmpDirPath: string;
  dependencyDirPath: string;
}> {
  const [depDirPath, depTmpDirPath] = await Promise.all([
    ensureUserFluenceCargoDir(),
    ensureUserFluenceTmpCargoDir(),
  ]);

  const dependencyPathEnding = join(...name.split("/"), version);
  return {
    dependencyTmpDirPath: join(depTmpDirPath, dependencyPathEnding),
    dependencyDirPath: join(depDirPath, dependencyPathEnding),
  };
}

type HandleInstallationArg = {
  dependencyDirPath: string;
  dependencyTmpDirPath: string;
  name: string;
  version: string;
  toolchain: string | undefined;
};

export async function installUsingCargo({
  dependencyDirPath,
  dependencyTmpDirPath,
  name,
  version,
  toolchain,
}: HandleInstallationArg): Promise<void> {
  try {
    // if dependency is already installed it will be there
    // so there is no need to install
    await access(dependencyDirPath);
  } catch {
    await rm(dependencyTmpDirPath, { recursive: true, force: true });

    await installCargoDependency({
      dependencyDirPath,
      dependencyTmpDirPath,
      name,
      toolchain,
      version,
    });

    await rm(dependencyDirPath, { recursive: true, force: true });
    // Make sure the parent directory exists before moving the dependency folder inside it.
    await mkdir(join(dependencyDirPath, ".."), { recursive: true });
    await rename(dependencyTmpDirPath, dependencyDirPath);

    commandObj.log(
      `Successfully installed ${name}@${version} to ${dependencyDirPath}`,
    );
  }
}
