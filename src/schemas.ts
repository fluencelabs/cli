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

import { appSchema } from "./lib/configs/project/app.js";
import { fluenceSchema } from "./lib/configs/project/fluence.js";
import { moduleSchema } from "./lib/configs/project/module.js";
import { projectSecretsSchema } from "./lib/configs/project/projectSecrets.js";
import { serviceSchema } from "./lib/configs/project/service.js";
import { spellSchema } from "./lib/configs/project/spell.js";
import { workersSchema } from "./lib/configs/project/workers.js";
import { userConfigSchema } from "./lib/configs/user/config.js";
import { userSecretsSchema } from "./lib/configs/user/userSecrets.js";
import {
  APP_CONFIG_FILE_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  JSON_EXT,
  YAML_EXT,
  MODULE_CONFIG_FILE_NAME,
  PROJECT_SECRETS_CONFIG_FILE_NAME,
  SCHEMAS_DIR_NAME,
  SERVICE_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FILE_NAME,
  CONFIG_FILE_NAME,
  WORKERS_CONFIG_FILE_NAME,
  SPELL_CONFIG_FILE_NAME,
  FS_OPTIONS,
} from "./lib/const.js";
import { execPromise } from "./lib/execPromise.js";
import { jsonStringify } from "./lib/helpers/jsonStringify.js";

const DOCS_CONFIGS_DIR_PATH = join("docs", "configs");

const schemas = Object.entries({
  [FLUENCE_CONFIG_FILE_NAME]: fluenceSchema,
  [APP_CONFIG_FILE_NAME]: appSchema,
  [MODULE_CONFIG_FILE_NAME]: moduleSchema,
  [SERVICE_CONFIG_FILE_NAME]: serviceSchema,
  [CONFIG_FILE_NAME]: userConfigSchema,
  [USER_SECRETS_CONFIG_FILE_NAME]: userSecretsSchema,
  [PROJECT_SECRETS_CONFIG_FILE_NAME]: projectSecretsSchema,
  [WORKERS_CONFIG_FILE_NAME]: workersSchema,
  [SPELL_CONFIG_FILE_NAME]: spellSchema,
});

const main = async (): Promise<void> => {
  if (process.argv[2] === "-f") {
    return writeFile(
      join("docs", "configs", "README.md"),
      `# Fluence CLI Configs

${schemas
  .map(([name, schema]): string => {
    return `## [${name}](./${name.replace(`.${YAML_EXT}`, ".md")})\n\n${String(
      schema["description"]
    )}`;
  })
  .join("\n")}`
    );
  }

  await mkdir(SCHEMAS_DIR_NAME, { recursive: true });
  await mkdir(DOCS_CONFIGS_DIR_PATH, { recursive: true });

  const schemasWithPath = schemas.map(([filename, schema]) => {
    return {
      path: join(SCHEMAS_DIR_NAME, `${filename}.schema.${JSON_EXT}`),
      filename,
      schema,
    };
  });

  await Promise.all(
    schemasWithPath.map(({ path, schema }): Promise<void> => {
      return writeFile(path, jsonStringify(schema), FS_OPTIONS);
    })
  );

  const results = await Promise.all(
    schemasWithPath.map(async ({ path, filename }) => {
      return {
        filename,
        md: await execPromise({
          command: "json-schema-docs",
          args: ["-schema", path],
        }),
      };
    })
  );

  await Promise.all(
    results.map(({ filename, md }) => {
      return writeFile(
        join(
          DOCS_CONFIGS_DIR_PATH,
          `${filename.replace(`.${YAML_EXT}`, ".md")}`
        ),
        md,
        FS_OPTIONS
      );
    })
  );
};

main().catch(console.error);
