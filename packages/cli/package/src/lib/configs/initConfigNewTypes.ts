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

import type { JSONSchemaType } from "ajv";

import type { ValidationResult } from "../helpers/validations.js";

import type { GetPath } from "./initConfig.js";

export type InitializedConfig<LatestConfig> = LatestConfig & {
  $getPath(): string;
  $commit(): Promise<void>;
};

export type GetDefaultConfig<LatestConfig> = () =>
  | LatestConfig
  | Promise<LatestConfig>;

export type ConfigOptionsWithoutMigrate<Config> = {
  schema: JSONSchemaType<Config> & {
    title?: string;
    description?: string;
    properties: { version?: unknown };
    required?: string[];
  };
  validate?: (
    config: Config,
    configPath: string,
  ) => ValidationResult | Promise<ValidationResult>;
};

export type ConfigOptions<PrevConfig, Config> = PrevConfig extends undefined
  ? ConfigOptionsWithoutMigrate<Config>
  : ConfigOptionsWithoutMigrate<Config> & {
      migrate: (prevConfig: PrevConfig) => Config | Promise<Config>;
    };

export type GetLatestConfig<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9> =
  C9 extends undefined
    ? C8 extends undefined
      ? C7 extends undefined
        ? C6 extends undefined
          ? C5 extends undefined
            ? C4 extends undefined
              ? C3 extends undefined
                ? C2 extends undefined
                  ? C1 extends undefined
                    ? C0
                    : C1
                  : C2
                : C3
              : C4
            : C5
          : C6
        : C7
      : C8
    : C9;

export type OptionsTuple<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9> =
  C9 extends undefined
    ? C8 extends undefined
      ? C7 extends undefined
        ? C6 extends undefined
          ? C5 extends undefined
            ? C4 extends undefined
              ? C3 extends undefined
                ? C2 extends undefined
                  ? C1 extends undefined
                    ? [ConfigOptions<undefined, C0>]
                    : [ConfigOptions<undefined, C0>, ConfigOptions<C0, C1>]
                  : [
                      ConfigOptions<undefined, C0>,
                      ConfigOptions<C0, C1>,
                      ConfigOptions<C1, C2>,
                    ]
                : [
                    ConfigOptions<undefined, C0>,
                    ConfigOptions<C0, C1>,
                    ConfigOptions<C1, C2>,
                    ConfigOptions<C2, C3>,
                  ]
              : [
                  ConfigOptions<undefined, C0>,
                  ConfigOptions<C0, C1>,
                  ConfigOptions<C1, C2>,
                  ConfigOptions<C2, C3>,
                  ConfigOptions<C3, C4>,
                ]
            : [
                ConfigOptions<undefined, C0>,
                ConfigOptions<C0, C1>,
                ConfigOptions<C1, C2>,
                ConfigOptions<C2, C3>,
                ConfigOptions<C3, C4>,
                ConfigOptions<C4, C5>,
              ]
          : [
              ConfigOptions<undefined, C0>,
              ConfigOptions<C0, C1>,
              ConfigOptions<C1, C2>,
              ConfigOptions<C2, C3>,
              ConfigOptions<C3, C4>,
              ConfigOptions<C4, C5>,
              ConfigOptions<C5, C6>,
            ]
        : [
            ConfigOptions<undefined, C0>,
            ConfigOptions<C0, C1>,
            ConfigOptions<C1, C2>,
            ConfigOptions<C2, C3>,
            ConfigOptions<C3, C4>,
            ConfigOptions<C4, C5>,
            ConfigOptions<C5, C6>,
            ConfigOptions<C6, C7>,
          ]
      : [
          ConfigOptions<undefined, C0>,
          ConfigOptions<C0, C1>,
          ConfigOptions<C1, C2>,
          ConfigOptions<C2, C3>,
          ConfigOptions<C3, C4>,
          ConfigOptions<C4, C5>,
          ConfigOptions<C5, C6>,
          ConfigOptions<C6, C7>,
          ConfigOptions<C7, C8>,
        ]
    : [
        ConfigOptions<undefined, C0>,
        ConfigOptions<C0, C1>,
        ConfigOptions<C1, C2>,
        ConfigOptions<C2, C3>,
        ConfigOptions<C3, C4>,
        ConfigOptions<C4, C5>,
        ConfigOptions<C5, C6>,
        ConfigOptions<C6, C7>,
        ConfigOptions<C7, C8>,
        ConfigOptions<C8, C9>,
      ];

export type InitConfigOptions<
  C0,
  C1 = undefined,
  C2 = undefined,
  C3 = undefined,
  C4 = undefined,
  C5 = undefined,
  C6 = undefined,
  C7 = undefined,
  C8 = undefined,
  C9 = undefined,
> = {
  description: string;
  options: OptionsTuple<C0, C1, C2, C3, C4, C5, C6, C7, C8, C9>;
  getConfigPath: GetPath;
  getSchemaDirPath?: GetPath;
};
