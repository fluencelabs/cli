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

import { access } from "node:fs/promises";
import { arch, platform } from "node:os";
import { join } from "node:path";

import { color } from "@oclif/color";

import versions from "../versions.json" assert { type: "json" };

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  MARINE_CARGO_DEPENDENCY,
  MREPL_CARGO_DEPENDENCY,
  RUST_WASM32_WASI_TARGET,
} from "./const.js";
import { addCountlyLog } from "./countly.js";
import { execPromise } from "./execPromise.js";
import { downloadFile } from "./helpers/downloadFile.js";
import {
  handleInstallation,
  resolveDependencies,
  resolveDependencyDirPathAndTmpPath,
  resolveVersionToInstall,
  splitPackageNameAndVersion,
  updateConfigsIfVersionChanged,
} from "./helpers/package.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { jsonStringify } from "./helpers/utils.js";

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

const isRustInstalled = async (): Promise<boolean> => {
  try {
    await execPromise({
      command: CARGO,
      args: ["--version"],
    });

    await execPromise({
      command: RUSTUP,
      args: ["--version"],
    });

    return true;
  } catch {
    return false;
  }
};

const regExpRecommendedToolchain = new RegExp(
  `^${versions["rust-toolchain"]}.*\\(override\\)$`,
  "gm",
);

const hasRequiredRustToolchain = async (): Promise<boolean> => {
  const toolChainList = await execPromise({
    command: RUSTUP,
    args: ["toolchain", "list"],
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
    });
  }

  return hasRequiredRustToolchain;
};

const hasRequiredRustTarget = async (): Promise<boolean> => {
  return (
    await execPromise({
      command: RUSTUP,
      args: ["target", "list"],
    })
  ).includes(`${RUST_WASM32_WASI_TARGET} (installed)`);
};

const getLatestVersionOfCargoDependency = async (
  name: string,
): Promise<string> => {
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
};

type InstallCargoDependencyArg = {
  toolchain: string | undefined;
  name: string;
  version: string;
  dependencyTmpDirPath: string;
  dependencyDirPath: string;
};

const installCargoDependency = async ({
  toolchain,
  name,
  version,
  dependencyDirPath,
  dependencyTmpDirPath,
}: InstallCargoDependencyArg) => {
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
    spinnerMessage: `Installing ${name}@${version} to ${dependencyDirPath}`,
    printOutput: true,
  });
};

type TryDownloadingBinaryArg = {
  name: string;
  version: string;
  dependencyDirPath: string;
  force: boolean;
};

/**
 * Attempts to download pre-built binary from github releases
 * @return true if binary was downloaded successfully and is working. Otherwise returns error message
 */
const tryDownloadingBinary = async ({
  name,
  version,
  dependencyDirPath,
  force,
}: TryDownloadingBinaryArg): Promise<string | true> => {
  if (![MARINE_CARGO_DEPENDENCY, MREPL_CARGO_DEPENDENCY].includes(name)) {
    return 'Only "marine" and "mrepl" cargo dependencies can be downloaded as pre-built binaries';
  }

  const binaryPath = join(dependencyDirPath, "bin", name);

  if (force) {
    return "`--force` flag was used";
  }

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
};

type CargoDependencyArg = {
  nameAndVersion: string;
  maybeFluenceConfig: FluenceConfig | null;
  global?: boolean;
  force?: boolean;
  toolchain?: string | undefined;
  explicitInstallation?: boolean;
};

export const ensureCargoDependency = async ({
  nameAndVersion,
  maybeFluenceConfig,
  global = true,
  force = false,
  toolchain: toolchainFromArgs,
  explicitInstallation = false,
}: CargoDependencyArg): Promise<string> => {
  await ensureRust();
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const resolveVersionToInstallResult = await resolveVersionToInstall({
    name,
    maybeVersion,
    packageManager: "cargo",
    maybeFluenceConfig,
  });

  const version =
    "versionToInstall" in resolveVersionToInstallResult
      ? resolveVersionToInstallResult.versionToInstall
      : await getLatestVersionOfCargoDependency(name);

  const toolchain =
    toolchainFromArgs ??
    (name in versions.cargo ? versions["rust-toolchain"] : undefined);

  const { dependencyDirPath, dependencyTmpDirPath } =
    await resolveDependencyDirPathAndTmpPath({
      name,
      packageManager: "cargo",
      version,
    });

  const maybeErrorMessage = await tryDownloadingBinary({
    name,
    version,
    dependencyDirPath,
    force,
  });

  if (typeof maybeErrorMessage === "string") {
    commandObj.warn(
      `Using cargo to install ${name}@${version} instead of using downloaded pre-built binary. Reason: ${maybeErrorMessage}`,
    );

    await handleInstallation({
      force,
      dependencyDirPath,
      dependencyTmpDirPath,
      explicitInstallation,
      name,
      version,
      installDependency: () => {
        return installCargoDependency({
          dependencyDirPath,
          dependencyTmpDirPath,
          name,
          toolchain,
          version,
        });
      },
    });
  }

  await updateConfigsIfVersionChanged({
    maybeFluenceConfig,
    name,
    version,
    global,
    packageManager: "cargo",
  });

  await addCountlyLog(`Using ${name}@${version} cargo dependency`);
  return dependencyDirPath;
};

type InstallAllDependenciesArg = {
  maybeFluenceConfig: FluenceConfig | null;
  force: boolean;
};

export const installAllCargoDependencies = async ({
  maybeFluenceConfig,
  force,
}: InstallAllDependenciesArg): Promise<void> => {
  for (const [name, version] of Object.entries(
    await resolveDependencies("cargo", maybeFluenceConfig),
  )) {
    // Not installing dependencies in parallel
    // for cargo logs to be clearly readable
    // eslint-disable-next-line no-await-in-loop
    await ensureCargoDependency({
      nameAndVersion: `${name}@${version}`,
      maybeFluenceConfig,
      force,
    });
  }
};
