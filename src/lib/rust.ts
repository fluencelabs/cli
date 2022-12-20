/**
 * Copyright 2022 Fluence Labs Limited
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

import path from "node:path";

import color from "@oclif/color";

import type { FluenceConfig } from "./configs/project/fluence";
import type { FluenceLockConfig } from "./configs/project/fluenceLock";
import {
  BIN_DIR_NAME,
  CommandObj,
  MARINE_CARGO_DEPENDENCY,
  MARINE_RECOMMENDED_VERSION,
  MREPL_CARGO_DEPENDENCY,
  MREPL_RECOMMENDED_VERSION,
  REQUIRED_RUST_TOOLCHAIN,
  RUST_WASM32_WASI_TARGET,
} from "./const";
import { execPromise } from "./execPromise";
import {
  handleInstallation,
  handleLockConfig,
  resolveDependencyPathAndTmpPath,
  resolveVersionToInstall,
  splitPackageNameAndVersion,
} from "./helpers/package";
import { replaceHomeDir } from "./helpers/replaceHomeDir";

const CARGO = "cargo";
const RUSTUP = "rustup";

const ensureRust = async (commandObj: CommandObj): Promise<void> => {
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
      message: "Installing Rust",
      printOutput: true,
    });

    if (!(await isRustInstalled())) {
      commandObj.error(
        `Installed rust without errors but ${color.yellow(
          RUSTUP
        )} or ${color.yellow(CARGO)} not in PATH`
      );
    }
  }

  if (!(await hasRequiredRustToolchain())) {
    await execPromise({
      command: RUSTUP,
      args: ["install", REQUIRED_RUST_TOOLCHAIN],
      message: `Installing ${color.yellow(
        REQUIRED_RUST_TOOLCHAIN
      )} rust toolchain`,
      printOutput: true,
    });

    if (!(await hasRequiredRustToolchain())) {
      commandObj.error(
        `Not able to install ${color.yellow(
          REQUIRED_RUST_TOOLCHAIN
        )} rust toolchain`
      );
    }
  }

  if (!(await hasRequiredRustTarget())) {
    await execPromise({
      command: RUSTUP,
      args: ["target", "add", RUST_WASM32_WASI_TARGET],
      message: `Adding ${color.yellow(RUST_WASM32_WASI_TARGET)} rust target`,
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

const hasRequiredRustToolchain = async (): Promise<boolean> =>
  (
    await execPromise({
      command: RUSTUP,
      args: ["toolchain", "list"],
    })
  ).includes(REQUIRED_RUST_TOOLCHAIN);

const hasRequiredRustTarget = async (): Promise<boolean> =>
  (
    await execPromise({
      command: RUSTUP,
      args: ["target", "list"],
    })
  ).includes(`${RUST_WASM32_WASI_TARGET} (installed)`);

type CargoDependencyInfo = {
  recommendedVersion: string;
  toolchain?: string;
};

export const fluenceCargoDependencies: Record<string, CargoDependencyInfo> = {
  [MARINE_CARGO_DEPENDENCY]: {
    recommendedVersion: MARINE_RECOMMENDED_VERSION,
    toolchain: REQUIRED_RUST_TOOLCHAIN,
  },
  [MREPL_CARGO_DEPENDENCY]: {
    recommendedVersion: MREPL_RECOMMENDED_VERSION,
    toolchain: REQUIRED_RUST_TOOLCHAIN,
  },
};

type GetLatestVersionOfCargoDependency = {
  name: string;
  commandObj: CommandObj;
};

export const getLatestVersionOfCargoDependency = async ({
  name,
  commandObj,
}: GetLatestVersionOfCargoDependency): Promise<string> =>
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
    message: `Installing ${name}@${version} to ${replaceHomeDir(
      dependencyPath
    )}`,
    printOutput: true,
  });
};

type CargoDependencyArg = {
  nameAndVersion: string;
  commandObj: CommandObj;
  maybeFluenceConfig: FluenceConfig | null;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  force?: boolean;
  toolchain?: string | undefined;
  explicitInstallation?: boolean;
};

export const ensureCargoDependency = async ({
  nameAndVersion,
  commandObj,
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  force = false,
  toolchain: toolchainFromArgs,
  explicitInstallation = false,
}: CargoDependencyArg): Promise<string> => {
  await ensureRust(commandObj);
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const version =
    resolveVersionToInstall({
      name,
      maybeVersion,
      explicitInstallation,
      maybeFluenceLockConfig,
      maybeFluenceConfig,
      packageManager: "cargo",
    }) ?? (await getLatestVersionOfCargoDependency({ name, commandObj }));

  const maybeCargoDependencyInfo = fluenceCargoDependencies[name];
  const toolchain = toolchainFromArgs ?? maybeCargoDependencyInfo?.toolchain;

  const { dependencyPath, dependencyTmpPath } =
    await resolveDependencyPathAndTmpPath({
      commandObj,
      name,
      packageManager: "cargo",
      version,
    });

  await handleInstallation({
    force,
    dependencyPath,
    dependencyTmpPath,
    commandObj,
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

  await handleLockConfig({
    commandObj,
    isFluenceProject: maybeFluenceConfig !== null,
    maybeFluenceLockConfig,
    name,
    packageManager: "cargo",
    version,
  });

  return maybeCargoDependencyInfo === undefined
    ? dependencyPath
    : path.join(dependencyPath, BIN_DIR_NAME, name);
};
