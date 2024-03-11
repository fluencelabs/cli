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

import { access, readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import type { JSONSchemaType } from "ajv";

import type { FluenceConfigReadonly } from "../lib/configs/project/fluence.js";
import { type ModuleConfigReadonly } from "../lib/configs/project/module.js";
import { MODULE_TYPE_RUST, DEFAULT_MARINE_BUILD_ARGS } from "../lib/const.js";
import type { MarineCLI } from "../lib/marineCli.js";

import { ajv, validationErrorToString } from "./ajvInstance.js";
import { commandObj } from "./commandObj.js";
import { FS_OPTIONS } from "./const.js";
import { projectRootDir, getCargoTomlPath } from "./paths.js";

type CargoWorkspaceToml = {
  workspace?: {
    members?: string[];
  };
};

const cargoWorkspaceTomlSchema: JSONSchemaType<CargoWorkspaceToml> = {
  type: "object",
  properties: {
    workspace: {
      type: "object",
      properties: {
        members: {
          type: "array",
          items: {
            type: "string",
          },
          nullable: true,
        },
      },
      required: [],
      nullable: true,
    },
  },
  required: [],
};

const validateCargoWorkspaceToml = ajv.compile(cargoWorkspaceTomlSchema);

async function updateWorkspaceCargoToml(
  moduleAbsolutePaths: string[],
): Promise<void> {
  const cargoTomlPath = getCargoTomlPath();
  let cargoTomlFileContent: string;

  try {
    cargoTomlFileContent = await readFile(cargoTomlPath, FS_OPTIONS);
  } catch {
    cargoTomlFileContent = `[workspace]
members = []
`;
  }

  const { parse } = await import("@iarna/toml");
  const parsedConfig: unknown = parse(cargoTomlFileContent);

  if (!validateCargoWorkspaceToml(parsedConfig)) {
    return commandObj.error(
      `Cargo.toml at ${cargoTomlPath} is not valid. Please fix it manually. ${await validationErrorToString(
        validateCargoWorkspaceToml.errors,
      )}`,
    );
  }

  const oldCargoWorkspaceMembers = parsedConfig.workspace?.members ?? [];

  const cargoWorkspaceMembersExistance = await Promise.allSettled(
    oldCargoWorkspaceMembers.map((member) => {
      return access(member);
    }),
  );

  const existingCargoWorkspaceMembers = oldCargoWorkspaceMembers.filter(
    (_, i) => {
      return cargoWorkspaceMembersExistance[i]?.status === "fulfilled";
    },
  );

  const newConfig = {
    ...parsedConfig,
    workspace: {
      ...(parsedConfig.workspace ?? {}),
      members: [
        ...new Set([
          ...existingCargoWorkspaceMembers,
          ...moduleAbsolutePaths.map((moduleAbsolutePath) => {
            return relative(projectRootDir, moduleAbsolutePath);
          }),
        ]),
      ],
    },
  };

  const stringifyToTOML = (await import("@iarna/toml/stringify.js")).default;
  await writeFile(cargoTomlPath, stringifyToTOML(newConfig), FS_OPTIONS);
}

export async function buildModules(
  modulesConfigs: ModuleConfigReadonly[],
  marineCli: MarineCLI,
  marineBuildArgs: string | undefined,
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null,
): Promise<void> {
  const rustModuleConfigs = modulesConfigs.filter(({ type }) => {
    return type === MODULE_TYPE_RUST;
  });

  await updateWorkspaceCargoToml(
    rustModuleConfigs.map((moduleConfig) => {
      return moduleConfig.$getDirPath();
    }),
  );

  if (rustModuleConfigs.length === 0) {
    return;
  }

  const pFlagsForEachModule = rustModuleConfigs.flatMap(({ name }) => {
    return ["-p", name];
  });

  const marineBuildArgsToUse = (
    marineBuildArgs ??
    maybeFluenceConfig?.marineBuildArgs ??
    DEFAULT_MARINE_BUILD_ARGS
  ).split(" ");

  await marineCli({
    args: ["build", ...pFlagsForEachModule, ...marineBuildArgsToUse],
    cwd: projectRootDir,
  });
}
