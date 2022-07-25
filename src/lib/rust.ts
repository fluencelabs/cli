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

import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";

import { getVersionToUse } from "./configs/user/dependency";
import {
  BIN_DIR_NAME,
  CargoDependency,
  CARGO_GENERATE_CARGO_DEPENDENCY,
  CARGO_GENERATE_RECOMMENDED_VERSION,
  CommandObj,
  FS_OPTIONS,
  MARINE_CARGO_DEPENDENCY,
  MARINE_RECOMMENDED_VERSION,
  MREPL_CARGO_DEPENDENCY,
  MREPL_RECOMMENDED_VERSION,
  RUST_TOOLCHAIN_REQUIRED_TO_INSTALL_MARINE,
  RUST_WASM32_WASI_TARGET,
} from "./const";
import { execPromise } from "./execPromise";
import { replaceHomeDir } from "./helpers/replaceHomeDir";
import { unparseFlags } from "./helpers/unparseFlags";
import {
  ensureUserFluenceCargoCratesPath,
  ensureUserFluenceCargoDir,
} from "./paths";

const CARGO = "cargo";
const RUSTUP = "rustup";

const ensureRust = async (commandObj: CommandObj): Promise<void> => {
  if (!(await isRustInstalled())) {
    if (commandObj.config.windows) {
      commandObj.error(
        "Rust needs to be installed. Please visit https://www.rust-lang.org/tools/install for installation instructions"
      );
    }

    const rustupInitFlags = unparseFlags(
      {
        quiet: true,
        y: true,
      },
      commandObj
    );

    await execPromise(
      `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- ${rustupInitFlags}`,
      "Installing rust"
    );

    if (!(await isRustInstalled())) {
      commandObj.error(
        `Installed rust without errors but ${color.yellow(
          RUSTUP
        )} or ${color.yellow(CARGO)} not in PATH`
      );
    }
  }

  if (!(await hasRequiredRustToolchain())) {
    await execPromise(
      `${RUSTUP} install ${RUST_TOOLCHAIN_REQUIRED_TO_INSTALL_MARINE}`,
      `Installing ${color.yellow(
        RUST_TOOLCHAIN_REQUIRED_TO_INSTALL_MARINE
      )} rust toolchain`
    );
    if (!(await hasRequiredRustToolchain())) {
      commandObj.error(
        `Not able to install ${color.yellow(
          RUST_TOOLCHAIN_REQUIRED_TO_INSTALL_MARINE
        )} rust toolchain`
      );
    }
  }

  if (!(await hasRequiredRustTarget())) {
    await execPromise(
      `${RUSTUP} target add ${RUST_WASM32_WASI_TARGET}`,
      `Adding ${color.yellow(RUST_WASM32_WASI_TARGET)} rust target`
    );
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
    await execPromise(`${CARGO} --version`);
    await execPromise(`${RUSTUP} --version`);
    return true;
  } catch {
    return false;
  }
};

const hasRequiredRustToolchain = async (): Promise<boolean> =>
  (await execPromise(`${RUSTUP} toolchain list`)).includes(
    RUST_TOOLCHAIN_REQUIRED_TO_INSTALL_MARINE
  );

const hasRequiredRustTarget = async (): Promise<boolean> =>
  (await execPromise(`${RUSTUP} target list`)).includes(
    RUST_WASM32_WASI_TARGET
  );

const cargoInstall = async ({
  packageName,
  version,
  isNightly,
  isGlobalDependency,
  commandObj,
  message,
}: CargoDependencyInfo & {
  version: string;
  commandObj: CommandObj;
  message: string;
}): Promise<string> => {
  await ensureRust(commandObj);
  return execPromise(
    `${CARGO}${
      isNightly === true ? " +nightly" : ""
    } install ${packageName} ${unparseFlags(
      {
        version,
        ...(isGlobalDependency === true
          ? {}
          : {
              root: await ensureUserFluenceCargoDir(
                commandObj,
                isGlobalDependency
              ),
            }),
      },
      commandObj
    )}`,
    message
  );
};

type CargoDependencyInfo = {
  recommendedVersion: string;
  packageName: string;
  isNightly?: true;
  isGlobalDependency?: true;
};

export const cargoDependencies: Record<CargoDependency, CargoDependencyInfo> = {
  [MARINE_CARGO_DEPENDENCY]: {
    recommendedVersion: MARINE_RECOMMENDED_VERSION,
    packageName: MARINE_CARGO_DEPENDENCY,
    isNightly: true,
  },
  [MREPL_CARGO_DEPENDENCY]: {
    recommendedVersion: MREPL_RECOMMENDED_VERSION,
    packageName: MREPL_CARGO_DEPENDENCY,
    isNightly: true,
  },
  [CARGO_GENERATE_CARGO_DEPENDENCY]: {
    recommendedVersion: CARGO_GENERATE_RECOMMENDED_VERSION,
    packageName: CARGO_GENERATE_CARGO_DEPENDENCY,
    isGlobalDependency: true,
  },
};

type CargoDependencyOptions = {
  name: CargoDependency;
  commandObj: CommandObj;
};

const isCorrectVersionInstalled = async ({
  name,
  commandObj,
  isGlobalDependency,
}: CargoDependencyOptions & {
  isGlobalDependency: true | undefined;
}): Promise<boolean> => {
  const { packageName, recommendedVersion } = cargoDependencies[name];
  const cratesTomlPath = await ensureUserFluenceCargoCratesPath(
    commandObj,
    isGlobalDependency
  );
  const version = await getVersionToUse(recommendedVersion, name, commandObj);

  try {
    const cratesTomlContent = await fsPromises.readFile(
      cratesTomlPath,
      FS_OPTIONS
    );
    return cratesTomlContent.includes(`${packageName} ${version}`);
  } catch {
    return false;
  }
};

export const ensureCargoDependency = async ({
  name,
  commandObj,
}: CargoDependencyOptions): Promise<string> => {
  const dependency = cargoDependencies[name];
  const { isGlobalDependency, packageName, recommendedVersion } = dependency;
  const userFluenceCargoCratesPath = await ensureUserFluenceCargoCratesPath(
    commandObj,
    isGlobalDependency
  );
  const dependencyPath = path.join(
    await ensureUserFluenceCargoDir(commandObj, isGlobalDependency),
    BIN_DIR_NAME,
    packageName
  );
  if (
    await isCorrectVersionInstalled({ name, commandObj, isGlobalDependency })
  ) {
    return dependencyPath;
  }
  const version = await getVersionToUse(recommendedVersion, name, commandObj);

  await cargoInstall({
    version,
    message: `Installing version ${color.yellow(
      version
    )} of ${packageName} to ${replaceHomeDir(
      await ensureUserFluenceCargoDir(commandObj, isGlobalDependency)
    )}`,
    commandObj,
    ...dependency,
  });

  if (
    await isCorrectVersionInstalled({ name, commandObj, isGlobalDependency })
  ) {
    return dependencyPath;
  }

  return commandObj.error(
    `Not able to install ${color.yellow(
      version
    )} of ${packageName} to ${replaceHomeDir(userFluenceCargoCratesPath)}`
  );
};
