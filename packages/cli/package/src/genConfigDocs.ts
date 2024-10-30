/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import assert from "node:assert";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { jsonStringify } from "./common.js";
import { getLatestConfigOptions } from "./lib/configs/initConfigNew.js";
import { addTitleDescriptionAndVersionToSchemas } from "./lib/configs/initConfigNew.js";
import { options as envOptions } from "./lib/configs/project/env/env.js";
import { fluenceSchema } from "./lib/configs/project/fluence.js";
import { moduleSchema } from "./lib/configs/project/module.js";
import { options as providerOptions } from "./lib/configs/project/provider/provider.js";
import { options as providerArtifactsOptions } from "./lib/configs/project/providerArtifacts/providerArtifacts.js";
import { options as providerSecretsOptions } from "./lib/configs/project/providerSecrets/providerSecrets.js";
import { serviceSchema } from "./lib/configs/project/service.js";
import { spellSchema } from "./lib/configs/project/spell.js";
import { workersSchema } from "./lib/configs/project/workers.js";
import { options as userConfigOptions } from "./lib/configs/user/config/config.js";
import {
  FLUENCE_CONFIG_FILE_NAME,
  JSON_EXT,
  MODULE_CONFIG_FILE_NAME,
  SCHEMAS_DIR_NAME,
  SERVICE_CONFIG_FILE_NAME,
  USER_CONFIG_FILE_NAME,
  WORKERS_CONFIG_FILE_NAME,
  SPELL_CONFIG_FILE_NAME,
  FS_OPTIONS,
  YAML_EXT,
  CLI_NAME_FULL,
  PROVIDER_CONFIG_FILE_NAME,
  ENV_CONFIG_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FILE_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FILE_NAME,
} from "./lib/const.js";
import { execPromise } from "./lib/execPromise.js";
import CLIPackageJSON from "./versions/cli.package.json";

const DOCS_CONFIGS_DIR_PATH = join("docs", "configs");
const DOCS_COMMANDS_PATH = join("docs", "commands", "README.md");

const configsInfo = Object.entries({
  [FLUENCE_CONFIG_FILE_NAME]: fluenceSchema,
  [PROVIDER_CONFIG_FILE_NAME]: getLatestConfigOptions(
    await addTitleDescriptionAndVersionToSchemas(providerOptions),
  ).schema,
  [PROVIDER_SECRETS_CONFIG_FILE_NAME]: getLatestConfigOptions(
    await addTitleDescriptionAndVersionToSchemas(providerSecretsOptions),
  ).schema,
  [MODULE_CONFIG_FILE_NAME]: moduleSchema,
  [SERVICE_CONFIG_FILE_NAME]: serviceSchema,
  [SPELL_CONFIG_FILE_NAME]: spellSchema,
  [WORKERS_CONFIG_FILE_NAME]: workersSchema,
  [USER_CONFIG_FILE_NAME]: getLatestConfigOptions(
    await addTitleDescriptionAndVersionToSchemas(userConfigOptions),
  ).schema,
  [ENV_CONFIG_FILE_NAME]: getLatestConfigOptions(
    await addTitleDescriptionAndVersionToSchemas(envOptions),
  ).schema,
  [PROVIDER_ARTIFACTS_CONFIG_FILE_NAME]: getLatestConfigOptions(
    await addTitleDescriptionAndVersionToSchemas(providerArtifactsOptions),
  ).schema,
}).map(([filename, schema]) => {
  return {
    schemaPath: join(SCHEMAS_DIR_NAME, `${filename}.schema.${JSON_EXT}`),
    fullFileName: `${filename}.${YAML_EXT}`,
    docFileName: `${filename}.md`,
    schema,
  };
});

await mkdir(SCHEMAS_DIR_NAME, { recursive: true });
await mkdir(DOCS_CONFIGS_DIR_PATH, { recursive: true });

await Promise.all(
  configsInfo.map(({ schemaPath, schema }): Promise<void> => {
    return writeFile(schemaPath, jsonStringify(schema), FS_OPTIONS);
  }),
);

await Promise.all(
  configsInfo.map(async ({ schemaPath, docFileName }) => {
    const md = await execPromise({
      // This is a tool written in Go that is installed in CI and used for generating docs
      command: "json-schema-docs",
      args: ["-schema", schemaPath],
    });

    await writeFile(join(DOCS_CONFIGS_DIR_PATH, docFileName), md, FS_OPTIONS);
  }),
);

await writeFile(
  join(DOCS_CONFIGS_DIR_PATH, "README.md"),
  `# ${CLI_NAME_FULL} Configs

${configsInfo
  .map(({ fullFileName, schema, docFileName }): string => {
    const description: unknown = schema["description"];

    assert(
      typeof description === "string",
      `Please provide description for ${fullFileName} config`,
    );

    return `## [${fullFileName}](./${docFileName})\n\n${description}`;
  })
  .join("\n\n")}`,
);

const commandsContent = await readFile(DOCS_COMMANDS_PATH, FS_OPTIONS);

await writeFile(
  DOCS_COMMANDS_PATH,
  commandsContent.replaceAll(
    `/blob/v${CLIPackageJSON.version}/src/`,
    `/blob/fluence-cli-v${CLIPackageJSON.version}/src/`,
  ),
);
