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

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { dockerComposeSchema } from "./lib/configs/project/dockerCompose.js";
import { envSchema } from "./lib/configs/project/env.js";
import { fluenceSchema } from "./lib/configs/project/fluence.js";
import { moduleSchema } from "./lib/configs/project/module.js";
import { providerSchema } from "./lib/configs/project/provider.js";
import { providerArtifactsSchema } from "./lib/configs/project/providerArtifacts.js";
import { providerSecretsSchema } from "./lib/configs/project/providerSecrets.js";
import { serviceSchema } from "./lib/configs/project/service.js";
import { spellSchema } from "./lib/configs/project/spell.js";
import { workersSchema } from "./lib/configs/project/workers.js";
import { userConfigSchema } from "./lib/configs/user/config.js";
import {
  FLUENCE_CONFIG_FILE_NAME,
  JSON_EXT,
  MODULE_CONFIG_FILE_NAME,
  SCHEMAS_DIR_NAME,
  SERVICE_CONFIG_FILE_NAME,
  GLOBAL_CONFIG_FILE_NAME,
  WORKERS_CONFIG_FILE_NAME,
  SPELL_CONFIG_FILE_NAME,
  FS_OPTIONS,
  YAML_EXT,
  CLI_NAME_FULL,
  PROVIDER_CONFIG_FILE_NAME,
  ENV_CONFIG_FILE_NAME,
  DOCKER_COMPOSE_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FILE_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FILE_NAME,
} from "./lib/const.js";
import { execPromise } from "./lib/execPromise.js";
import { jsonStringify } from "./lib/helpers/utils.js";

const DOCS_CONFIGS_DIR_PATH = join("docs", "configs");

const configsInfo = Object.entries({
  [FLUENCE_CONFIG_FILE_NAME]: fluenceSchema,
  [PROVIDER_CONFIG_FILE_NAME]: providerSchema,
  [PROVIDER_SECRETS_CONFIG_FILE_NAME]: providerSecretsSchema,
  [MODULE_CONFIG_FILE_NAME]: moduleSchema,
  [SERVICE_CONFIG_FILE_NAME]: serviceSchema,
  [SPELL_CONFIG_FILE_NAME]: spellSchema,
  [WORKERS_CONFIG_FILE_NAME]: workersSchema,
  [GLOBAL_CONFIG_FILE_NAME]: userConfigSchema,
  [ENV_CONFIG_FILE_NAME]: envSchema,
  [DOCKER_COMPOSE_FILE_NAME]: dockerComposeSchema,
  [PROVIDER_ARTIFACTS_CONFIG_FILE_NAME]: providerArtifactsSchema,
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
    return `## [${fullFileName}](./${docFileName})\n\n${String(
      schema["description"],
    )}`;
  })
  .join("\n\n")}`,
);
