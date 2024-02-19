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

import { access } from "fs/promises";
import { dirname, resolve } from "path";

import type { JSONSchemaType } from "ajv";

import {
  CLI_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  SPELL_CONFIG_FILE_NAME,
  SPELL_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  U32_MAX,
} from "../../const.js";
import { ensureSpellAbsolutePath } from "../../helpers/downloadFile.js";
import { validateBatchAsync } from "../../helpers/validations.js";
import { getFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
} from "../initConfig.js";

const MAX_PERIOD_YEAR = 100;

/** Max period is 100 years in secs: 60 sec * 60 min * 24 hours * 365 days * 100 years */
const MAX_PERIOD_SEC = 60 * 60 * 24 * 365 * MAX_PERIOD_YEAR;

type SpellProperties = {
  aquaFilePath: string;
  function: string;
  initArgs?: Record<string, unknown>;
  clock?: {
    periodSec?: number;
    startTimestamp?: string;
    endTimestamp?: string;
    startDelaySec?: number;
    endDelaySec?: number;
  };
};

export type OverridableSpellProperties = Partial<SpellProperties>;

type ConfigV0 = {
  version: 0;
} & SpellProperties;

const spellProperties = {
  version: { type: "number", const: 0 },
  aquaFilePath: {
    type: "string",
    description:
      "Path to Aqua file which contains an Aqua function that you want to use as a spell",
  },
  function: {
    type: "string",
    description: "Name of the Aqua function that you want to use as a spell",
  },
  initArgs: {
    type: "object",
    description:
      "A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function and will be stored in the key-value storage for this particular spell.",
    nullable: true,
  },
  clock: {
    type: "object",
    additionalProperties: false,
    nullable: true,
    description: `Trigger the spell execution periodically. If you want to disable this property by overriding it in ${FLUENCE_CONFIG_FULL_FILE_NAME} - pass empty config for it like this: \`clock: {}\``,
    properties: {
      periodSec: {
        type: "number",
        description:
          "How often the spell will be executed. If set to 0, the spell will be executed only once. If this value not provided at all - the spell will never be executed",
        minimum: 0,
        maximum: MAX_PERIOD_SEC,
        nullable: true,
      },
      startTimestamp: {
        type: "string",
        description:
          "An ISO timestamp when the periodic execution should start. If this property or `startDelaySec` not specified, periodic execution will start immediately. If it is set to 0 - the spell will never be executed",
        nullable: true,
      },
      endTimestamp: {
        type: "string",
        description:
          "An ISO timestamp when the periodic execution should end. If this property or `endDelaySec` not specified, periodic execution will never end. If it is in the past at the moment of spell creation on Rust peer - the spell will never be executed",
        nullable: true,
      },
      startDelaySec: {
        type: "number",
        description:
          "How long to wait before the first execution in seconds. If this property or `startTimestamp` not specified, periodic execution will start immediately. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. This property conflicts with `startTimestamp`. You can specify only one of them",
        nullable: true,
        minimum: 0,
        maximum: U32_MAX,
      },
      endDelaySec: {
        type: "number",
        description:
          "How long to wait before the last execution in seconds. If this property or `endTimestamp` not specified, periodic execution will never end. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. If it is in the past at the moment of spell creation - the spell will never be executed. This property conflicts with `endTimestamp`. You can specify only one of them",
        nullable: true,
        minimum: 0,
        maximum: U32_MAX,
      },
    },
    required: [],
  },
} as const;

export const overridableSpellProperties = {
  ...spellProperties,
  aquaFilePath: {
    ...spellProperties.aquaFilePath,
    nullable: true,
  },
  function: {
    ...spellProperties.function,
    nullable: true,
  },
} as const;

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${SPELL_CONFIG_FULL_FILE_NAME}`,
  title: SPELL_CONFIG_FULL_FILE_NAME,
  description: `Defines a spell. You can use \`${CLI_NAME} spell new\` command to generate a template for new spell`,
  properties: spellProperties,
  required: ["version", "function", "aquaFilePath"],
  additionalProperties: false,
};

const migrations: Migrations<Config> = [];
type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type SpellConfig = InitializedConfig<LatestConfig>;
export type SpellConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getDateSec = (date: Date) => {
  return Math.round(date.getTime() / 1000);
};

export const resolveStartSec = ({ clock }: LatestConfig): number => {
  if (clock === undefined) {
    return 0;
  }

  if (clock.startDelaySec !== undefined) {
    return getDateSec(new Date()) + clock.startDelaySec;
  }

  return clock.startTimestamp === undefined
    ? 1
    : getDateSec(new Date(clock.startTimestamp));
};

export const resolveEndSec = ({ clock }: LatestConfig): number => {
  if (clock === undefined) {
    return 0;
  }

  if (clock.endDelaySec !== undefined) {
    return getDateSec(new Date()) + clock.endDelaySec;
  }

  return clock.endTimestamp === undefined
    ? 0
    : getDateSec(new Date(clock.endTimestamp));
};

const validate: ConfigValidateFunction<LatestConfig> = async (
  config,
  configPath,
) => {
  return validateBatchAsync(
    config.clock?.startTimestamp !== undefined &&
      config.clock.startDelaySec !== undefined
      ? `You can't specify both 'startTimestamp' and 'startDelaySec' properties`
      : true,

    config.clock?.endTimestamp !== undefined &&
      config.clock.endDelaySec !== undefined
      ? `You can't specify both 'endTimestamp' and 'endDelaySec' properties`
      : true,

    (() => {
      let endSec;

      try {
        endSec = resolveEndSec(config);
      } catch {
        return "Invalid `endTimestamp` value. It must be an ISO timestamp";
      }

      try {
        const startSec = resolveStartSec(config);

        if (startSec === 0) {
          return true;
        }

        if (endSec !== 0 && endSec < startSec) {
          return `Start time must be earlier than end time. Got: start time ${startSec}, end time ${endSec}`;
        }

        const currentSec = getDateSec(new Date());

        if (endSec !== 0 && endSec < currentSec) {
          return `End time must be later than current time. Got: current time ${currentSec}, end time ${endSec}`;
        }

        if ((config.clock?.periodSec ?? 0) > MAX_PERIOD_SEC) {
          return `Period must be less than ${MAX_PERIOD_YEAR} years (${MAX_PERIOD_SEC} seconds). Got: ${
            endSec - startSec
          } seconds`;
        }

        return true;
      } catch {
        return `Invalid 'startTimestamp' value. It must be an ISO timestamp`;
      }
    })(),
    (async () => {
      try {
        await access(resolve(dirname(configPath), config.aquaFilePath));
        return true;
      } catch {
        return `Aqua file '${config.aquaFilePath}' doesn't exist`;
      }
    })(),
  );
};

const getInitConfigOptions = (
  configPath: string,
): InitConfigOptions<Config, LatestConfig> => {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    validate,
    name: SPELL_CONFIG_FILE_NAME,
    getSchemaDirPath: getFluenceDir,
    getConfigOrConfigDirPath: (): string => {
      return configPath;
    },
  };
};

export const initSpellConfig = async (
  configOrConfigDirPathOrUrl: string,
  absolutePath: string,
): Promise<InitializedConfig<LatestConfig> | null> => {
  return getConfigInitFunction(
    getInitConfigOptions(
      await ensureSpellAbsolutePath(configOrConfigDirPathOrUrl, absolutePath),
    ),
  )();
};

export const initReadonlySpellConfig = async (
  configOrConfigDirPathOrUrl: string,
  absolutePath: string,
): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(
      await ensureSpellAbsolutePath(configOrConfigDirPathOrUrl, absolutePath),
    ),
  )();
};

const getDefault = (): string => {
  return `# Defines a spell. You can use \`fluence spell new\` command to generate a template for new spell

# config version
version: 0

# Path to Aqua file which contains an Aqua function that you want to use as a spell
aquaFilePath: "./spell.aqua"

# Name of the Aqua function that you want to use as a spell
function: spell

# # These arguments will be passed to the spell function and will be stored in the key-value storage for this particular spell.
# initArgs:
#   someArg: someArgStringValue

# Trigger the spell execution periodically
# If you want to disable this property by overriding it
# pass an empty config for it like this: \`clock: {}\`
clock:
  # How often the spell will be executed.
  # If set to 0, the spell will be executed only once.
  # If this value not provided at all - the spell will never be executed
  periodSec: 60
  # How long to wait before the last execution in seconds.
  # If this property or \`endTimestamp\` not specified, periodic execution will never end.
  # WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server.
  # If it is in the past at the moment of spell creation - the spell will never be executed.
  # This property conflicts with \`endTimestamp\`. You can specify only one of them
  endDelaySec: 1800

#   # other 'clock' properties:

#   # How long to wait before the first execution in seconds.
#   # If this property or \`startTimestamp\` not specified, periodic execution will start immediately.
#   # WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server.
#   # If it is set to 0 - the spell will never be executed
#   # This property conflicts with \`startTimestamp\`. You can specify only one of them
#   startDelaySec: 1
#   # An ISO timestamp when the periodic execution should start.
#   # If this property or \`startDelaySec\` not specified, periodic execution will start immediately.
#   startTimestamp: '2023-07-06T23:59:59Z'
#   # An ISO timestamp when the periodic execution should end.
#   # If this property or \`endDelaySec\` not specified, periodic execution will never end.
#   # If it is in the past at the moment of spell creation on Rust peer - the spell will never be executed
#   endTimestamp: '2023-07-06T23:59:59Z'
`;
};

export const initNewReadonlySpellConfig = (
  configPath: string,
): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(configPath),
    getDefault,
  )();
};

export const spellSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
