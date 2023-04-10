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

import fsPromises from "node:fs/promises";

import type { JSONSchemaType } from "ajv";

import { ajv } from "../ajvInstance.js";
import type { FluenceConfig } from "../configs/project/fluence.js";
import { AQUA_NPM_DEPENDENCY, FS_OPTIONS } from "../const.js";
import { installAllNPMDependencies } from "../npm.js";
import {
  ensureFluenceAquaDir,
  ensureUserFluenceNpmDir,
  ensureVSCodeSettingsJsonPath,
} from "../paths.js";

type GetAquaImportsArg = {
  maybeFluenceConfig: FluenceConfig | null;
  force?: boolean;
  flags?: { import?: string[] | undefined };
};

export async function ensureAquaImports(
  args?: GetAquaImportsArg
): Promise<string[]> {
  const defaultImports = [await ensureFluenceAquaDir()];

  if (args === undefined) {
    return defaultImports;
  }

  const { flags, maybeFluenceConfig, force } = args;

  const allNpmDependencies = (
    await installAllNPMDependencies({
      maybeFluenceConfig,
      force,
    })
  ).filter(
    (dependencyPath): boolean => !dependencyPath.includes(AQUA_NPM_DEPENDENCY)
  );

  return [...(flags?.import ?? []), ...defaultImports, ...allNpmDependencies];
}

const AQUA_SETTINGS_IMPORTS = "aquaSettings.imports";

type SettingsJson = {
  [AQUA_SETTINGS_IMPORTS]?: Array<string>;
};

const settingsJsonSchema: JSONSchemaType<SettingsJson> = {
  type: "object",
  properties: {
    [AQUA_SETTINGS_IMPORTS]: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: [],
};

const validateSettingsJson = ajv.compile(settingsJsonSchema);

const initSettingsConfig = async (
  aquaImports: string[] | undefined
): Promise<SettingsJson> => ({
  [AQUA_SETTINGS_IMPORTS]: aquaImports ?? (await ensureAquaImports()),
});

type EnsureRecommendedSettings = {
  aquaImports?: string[];
  generateSettingsJson?: boolean;
};

export const ensureVSCodeSettingsJSON = async ({
  aquaImports,
  generateSettingsJson = false,
}: EnsureRecommendedSettings): Promise<void> => {
  const settingsJsonPath = await ensureVSCodeSettingsJsonPath();

  let fileContent: string;

  try {
    fileContent = await fsPromises.readFile(settingsJsonPath, FS_OPTIONS);
  } catch {
    if (generateSettingsJson) {
      await fsPromises.writeFile(
        settingsJsonPath,
        JSON.stringify(await initSettingsConfig(aquaImports), null, 2) + "\n",
        FS_OPTIONS
      );
    }

    return;
  }

  let parsedFileContent: unknown;

  try {
    parsedFileContent = JSON.parse(fileContent);
  } catch {
    return;
  }

  if (validateSettingsJson(parsedFileContent)) {
    const newAquaImports = [...(aquaImports ?? (await ensureAquaImports()))];
    const userFluenceNpmDir = await ensureUserFluenceNpmDir();

    const newAquaImportPathStartsFromUserFluenceNpmDir = new Set(
      newAquaImports
        .filter((aquaImport): boolean =>
          aquaImport.startsWith(userFluenceNpmDir)
        )
        .map((aquaImport): string =>
          getUserFluenceNpmImportPathStart(aquaImport)
        )
    );

    const previousAquaImports = parsedFileContent[AQUA_SETTINGS_IMPORTS] ?? [];

    const previousAquaImportsFromUserFluenceNpmDir = previousAquaImports.filter(
      (aquaImport): boolean => aquaImport.startsWith(userFluenceNpmDir)
    );

    const deduplicatedPreviousAquaImportsFromUserFluenceNpmDir =
      previousAquaImportsFromUserFluenceNpmDir.filter(
        (previousAquaImport): boolean =>
          !newAquaImportPathStartsFromUserFluenceNpmDir.has(
            getUserFluenceNpmImportPathStart(previousAquaImport)
          )
      );

    parsedFileContent[AQUA_SETTINGS_IMPORTS] = [
      ...new Set([
        ...newAquaImports,
        ...previousAquaImports.filter(
          (aquaImport): boolean => !aquaImport.startsWith(userFluenceNpmDir)
        ),
        ...deduplicatedPreviousAquaImportsFromUserFluenceNpmDir,
      ]),
    ];

    await fsPromises.writeFile(
      settingsJsonPath,
      JSON.stringify(parsedFileContent, null, 2) + "\n",
      FS_OPTIONS
    );
  }
};

const getUserFluenceNpmImportPathStart = (fullPath: string): string =>
  fullPath.split("/").slice(0, -2).join("/");
