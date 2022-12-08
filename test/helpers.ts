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

import { access, cp, rm } from "node:fs/promises";
import path from "node:path";

import { Template, templates } from "../src/lib/const";
import { execPromise, ExecPromiseArg } from "../src/lib/execPromise";

type FluenceArg = {
  args?: ExecPromiseArg["args"];
  flags?: ExecPromiseArg["flags"];
  cwd?: string;
};

export const fluence = async ({
  args = [],
  flags,
  cwd = process.cwd(),
}: FluenceArg): ReturnType<typeof execPromise> =>
  execPromise({
    command: "npx",
    args: [
      "ts-node",
      path.relative(cwd, path.join(process.cwd(), "bin/run")),
      ...args,
    ],
    flags,
    options: { cwd },
  });

const initFirstTime = async (template: Template) => {
  const templatePath = path.join("tmp", "templates", template);

  try {
    await access(templatePath);
  } catch {
    await fluence({ args: ["init", templatePath], flags: { template } });
  }

  return templatePath;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const initializedTemplatesPartial = templates.reduce<
  Partial<Record<Template, Promise<string>>>
>(
  (acc, val) => ({
    ...acc,
    [val]: initFirstTime(val),
  }),
  {}
) as Record<Template, Promise<string>>;

export const init = async (dir: string, template: Template): Promise<void> => {
  const templatePath = await initializedTemplatesPartial[template];

  try {
    await rm(dir, { recursive: true });
  } catch {}

  await cp(templatePath, dir, { recursive: true });
};

export type Test = {
  name: Parameters<typeof test>[0];
  callback: (cwd: string) => unknown | void | Promise<void | unknown>;
  template: Template;
};

export type TestUsingTemplateArg = {
  description: string;
  tests: Array<Test>;
};

export const testUsingTemplates = ({
  description,
  tests,
}: TestUsingTemplateArg): void => {
  describe(description, () => {
    for (const { name, callback, template } of tests) {
      test(name, async () => {
        const cwd = path.join("tmp", description, name);
        await init(cwd, template);
        await callback(path.join(process.cwd(), cwd));
      });
    }
  });
};
