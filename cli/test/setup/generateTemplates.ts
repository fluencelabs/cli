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

import { cp } from "fs/promises";
import { access } from "node:fs/promises";
import { join } from "path";

import {
  DOT_FLUENCE_DIR_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  SECRETS_DIR_NAME,
  type Template,
  TEMPLATES,
  TMP_DIR_NAME,
} from "../../src/lib/const.js";
import { fluence } from "../helpers/commonWithSetupTests.js";
import { fluenceEnv, NO_PROJECT_TEST_NAME } from "../helpers/constants.js";
import {
  getInitializedTemplatePath,
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
} from "../helpers/paths.js";

const [, ...restTemplatePaths] = await Promise.all(
  TEMPLATES.map((template) => {
    return initFirstTime(template);
  }),
);

const secretsPath = join(
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
);

const secretsConfigPath = join(
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  DOT_FLUENCE_DIR_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
);

await Promise.all(
  [...restTemplatePaths, join(TMP_DIR_NAME, NO_PROJECT_TEST_NAME)].map(
    (path) => {
      return Promise.all([
        cp(secretsPath, join(path, DOT_FLUENCE_DIR_NAME, SECRETS_DIR_NAME), {
          force: true,
          recursive: true,
        }),
        cp(
          secretsConfigPath,
          join(
            path,
            DOT_FLUENCE_DIR_NAME,
            PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
          ),
          {
            force: true,
            recursive: true,
          },
        ),
      ]);
    },
  ),
);

async function initFirstTime(template: Template) {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await access(templatePath);
  } catch {
    await fluence({
      args: ["init", templatePath],
      flags: { template, env: fluenceEnv, "no-input": true },
    });
  }

  return templatePath;
}
