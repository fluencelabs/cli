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

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import type { FluenceConfigReadonly } from "../lib/configs/project/fluence.js";
import { type ModuleConfigReadonly } from "../lib/configs/project/module.js";
import { MODULE_TYPE_RUST, DEFAULT_MARINE_BUILD_ARGS } from "../lib/const.js";
import type { MarineCLI } from "../lib/marineCli.js";

import { ajv, validationErrorToString } from "./ajvInstance.js";
import { commandObj } from "./commandObj.js";
import { FS_OPTIONS } from "./const.js";
import { splitErrorsAndResults } from "./helpers/utils.js";
import { projectRootDir, getCargoTomlPath } from "./paths.js";

type CargoWorkspaceToml = {
  workspace?: {
    members?: string[];
    dependencies?: Record<
      string,
      {
        version?: string;
        package?: string;
      }
    >;
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
        dependencies: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              version: {
                type: "string",
                nullable: true,
              },
              package: {
                type: "string",
                nullable: true,
              },
            },
            required: [],
            nullable: true,
          },
          required: [],
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
  moduleConfigs: ModuleConfigReadonly[],
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

  const packageVersionsMap = moduleConfigs.reduce<Record<string, string[]>>(
    (acc, { rustBindingCrate }) => {
      if (rustBindingCrate === undefined) {
        return acc;
      }

      acc[rustBindingCrate.name] = [
        ...(acc[rustBindingCrate.name] ?? []),
        rustBindingCrate.version,
      ];

      return acc;
    },
    {},
  );

  const prevPackageVersionsMap = Object.entries(
    parsedConfig.workspace?.dependencies ?? {},
  ).reduce<Record<string, string[]>>((acc, [name, { version, package: p }]) => {
    if (version === undefined) {
      return acc;
    }

    const packageName = p ?? name;
    acc[packageName] = [...(acc[packageName] ?? []), version];
    return acc;
  }, {});

  const [packagesWithDifferentVersions, packagesWithSingleVersion] =
    splitErrorsAndResults(
      Object.entries(packageVersionsMap)
        .map(([name, versions]) => {
          return {
            name,
            versions: [...new Set(versions)].filter((v) => {
              const prevPackageVersions = prevPackageVersionsMap[name];

              return (
                prevPackageVersions === undefined ||
                !prevPackageVersions.includes(v)
              );
            }),
          };
        })
        .filter(
          (
            packageAndVersions,
          ): packageAndVersions is {
            name: string;
            versions: [string, ...string[]];
          } => {
            return packageAndVersions.versions.length >= 1;
          },
        ),
      ({ name, versions }) => {
        const [version, ...restVersions] = versions;

        if (restVersions.length === 0) {
          return { result: { name, version } };
        }

        return { error: { name, versions } };
      },
    );

  if (packagesWithDifferentVersions.length > 0) {
    commandObj.logToStderr(
      `\n${color.yellow(
        "WARNING:",
      )} The following modules require different versions of rustBindingCrates. They will not be automatically added to the workspace at ${color.yellow(
        cargoTomlPath,
      )}. But you can add them manually. For example like this:\n\n${color.yellow(
        packagesWithDifferentVersions
          .map(({ name, versions }) => {
            return versions
              .map((version, i) => {
                return `[workspace.dependencies.${name}_${i}]\npackage = "${name}"\nversion = "${version}"`;
              })
              .join("\n");
          })
          .join("\n\n"),
      )}\n`,
    );
  }

  const members = [
    ...new Set([
      ...existingCargoWorkspaceMembers,
      ...moduleAbsolutePaths.map((moduleAbsolutePath) => {
        return relative(projectRootDir, moduleAbsolutePath);
      }),
    ]),
  ];

  const dependencies = {
    ...parsedConfig.workspace?.dependencies,
    ...Object.fromEntries(
      packagesWithSingleVersion.map(({ name, version }) => {
        return [name, { version }] as const;
      }),
    ),
  };

  const workspace = {
    ...(parsedConfig.workspace ?? {}),
    ...(members.length > 0 ? { members } : {}),
    ...(Object.keys(dependencies).length > 0 ? { dependencies } : {}),
  };

  const newConfig: CargoWorkspaceToml = {
    ...parsedConfig,
    ...(Object.entries(workspace).length > 0 ? { workspace } : {}),
  };

  if (Object.entries(newConfig).length === 0) {
    return;
  }

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
    modulesConfigs,
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
