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
import { join } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import versions from "../versions.json" assert { type: "json" };

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { userConfig } from "./configs/user/config.js";
import { RUST_WASM32_WASI_TARGET, isFluenceCargoDependency } from "./const.js";
import { addCountlyLog } from "./countly.js";
import { execPromise } from "./execPromise.js";
import { downloadFile } from "./helpers/downloadFile.js";
import {
  handleFluenceConfig,
  handleInstallation,
  handleUserConfig,
  resolveDependencies,
  resolveDependencyPathAndTmpPath,
  resolveVersionToInstall,
  splitPackageNameAndVersion,
} from "./helpers/package.js";
import { replaceHomeDir } from "./helpers/replaceHomeDir.js";

const CARGO = "cargo";
const RUSTUP = "rustup";

const ensureRust = async (): Promise<void> => {
  if (!(await isRustInstalled())) {
    if (commandObj.config.windows) {
      commandObj.error(
        "Rust needs to be installed. Please visit https://www.rust-lang.org/tools/install for installation instructions"
      );
    }

    await execPromise({
      command: "curl",
      args: [
        "--proto",
        "'=https'",
        "--tlsv1.2",
        "-sSf",
        "https://sh.rustup.rs",
        "|",
        "sh",
        "-s",
        "--",
        "--quiet",
        "-y",
      ],
      options: {
        shell: true,
      },
      spinnerMessage: "Installing Rust",
      printOutput: true,
    });

    if (!(await isRustInstalled())) {
      commandObj.error(
        `Installed rust without errors but ${color.yellow(
          RUSTUP
        )} or ${color.yellow(
          CARGO
        )} not in PATH. Try restarting your terminal, check if ${color.yellow(
          RUSTUP
        )} and ${color.yellow(
          CARGO
        )} are installed and if they are - run the command again`
      );
    }
  }

  if (!(await hasRequiredRustToolchain())) {
    await execPromise({
      command: RUSTUP,
      args: ["install", versions["rust-toolchain"]],
      spinnerMessage: `Installing ${color.yellow(
        versions["rust-toolchain"]
      )} rust toolchain`,
      printOutput: true,
    });

    if (!(await hasRequiredRustToolchain())) {
      commandObj.error(
        `Not able to install ${color.yellow(
          versions["rust-toolchain"]
        )} rust toolchain`
      );
    }
  }

  if (!(await hasRequiredRustTarget())) {
    await execPromise({
      command: RUSTUP,
      args: ["target", "add", RUST_WASM32_WASI_TARGET],
      spinnerMessage: `Adding ${color.yellow(
        RUST_WASM32_WASI_TARGET
      )} rust target`,
      printOutput: true,
    });

    if (!(await hasRequiredRustTarget())) {
      commandObj.error(
        `Not able to install ${color.yellow(
          RUST_WASM32_WASI_TARGET
        )} rust target`
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
  "gm"
);

const hasRequiredRustToolchain = async (): Promise<boolean> => {
  const toolChainList = await execPromise({
    command: RUSTUP,
    args: ["toolchain", "list"],
  });

  const hasRequiredRustToolchain = toolChainList.includes(
    versions["rust-toolchain"]
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

const hasRequiredRustTarget = async (): Promise<boolean> =>
  (
    await execPromise({
      command: RUSTUP,
      args: ["target", "list"],
    })
  ).includes(`${RUST_WASM32_WASI_TARGET} (installed)`);

export const getLatestVersionOfCargoDependency = async (
  name: string
): Promise<string> =>
  (
    (
      await execPromise({
        command: CARGO,
        args: ["search", name, "--limit", "1"],
      })
    ).split('"')[1] ??
    commandObj.error(
      `Not able to find the latest version of ${color.yellow(
        name
      )}. Please make sure ${color.yellow(name)} is spelled correctly`
    )
  ).trim();

type InstallCargoDependencyArg = {
  toolchain: string | undefined;
  name: string;
  version: string;
  dependencyTmpPath: string;
  dependencyPath: string;
};

const installCargoDependency = async ({
  toolchain,
  name,
  version,
  dependencyPath,
  dependencyTmpPath,
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
      root: dependencyTmpPath,
    },
    spinnerMessage: `Installing ${name}@${version} to ${replaceHomeDir(
      dependencyPath
    )}`,
    printOutput: true,
  });
};

const downloadPrebuiltCargoDependencies = async (
  name: string,
  version: string,
  dependencyPath: string
): Promise<void> => {
  const binaryPath = join(dependencyPath, "bin", name);

  try {
    await access(binaryPath);
  } catch {
    const url = `https://github.com/fluencelabs/marine/releases/download/${name}-v${version}/${name}-linux-x86_64`;

    commandObj.log(
      `Downloading prebuilt binary: ${color.yellow(name)}... from ${url}`
    );

    await downloadFile(binaryPath, url);

    await execPromise({
      command: "chmod",
      args: ["+x", binaryPath],
    });
  }
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
  global,
  force = false,
  toolchain: toolchainFromArgs,
  explicitInstallation = false,
}: CargoDependencyArg): Promise<string> => {
  await ensureRust();
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const resolveVersionToInstallResult = resolveVersionToInstall({
    name,
    maybeVersion,
    packageManager: "cargo",
  });

  const version =
    "versionToInstall" in resolveVersionToInstallResult
      ? resolveVersionToInstallResult.versionToInstall
      : await getLatestVersionOfCargoDependency(name);

  const toolchain =
    toolchainFromArgs ??
    (name in versions.cargo ? versions["rust-toolchain"] : undefined);

  const { dependencyPath, dependencyTmpPath } =
    await resolveDependencyPathAndTmpPath({
      name,
      packageManager: "cargo",
      version,
    });

  try {
    if (process.env.CI === "true") {
      await downloadPrebuiltCargoDependencies(name, version, dependencyPath);
    } else {
      throw new Error("Not in CI");
    }
  } catch {
    // Fallback to normal cargo install if Download fails in CI or if using CLI not in CI
    await handleInstallation({
      force,
      dependencyPath,
      dependencyTmpPath,
      explicitInstallation,
      name,
      version,
      installDependency: () =>
        installCargoDependency({
          dependencyPath,
          dependencyTmpPath,
          name,
          toolchain,
          version,
        }),
    });
  }

  if (
    global === false &&
    maybeFluenceConfig !== null &&
    version !==
      (maybeFluenceConfig?.dependencies?.cargo?.[name] ??
        (isFluenceCargoDependency(name) ? versions.cargo[name] : undefined))
  ) {
    await handleFluenceConfig({
      fluenceConfig: maybeFluenceConfig,
      name,
      packageManager: "cargo",
      version,
    });
  } else if (
    global === true &&
    version !==
      (userConfig.dependencies?.cargo?.[name] ??
        (isFluenceCargoDependency(name) ? versions.cargo[name] : undefined))
  ) {
    await handleUserConfig({
      name,
      packageManager: "cargo",
      version,
    });
  }

  addCountlyLog(`Using ${name}@${version} cargo dependency`);

  return dependencyPath;
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
    await resolveDependencies("cargo", maybeFluenceConfig)
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
