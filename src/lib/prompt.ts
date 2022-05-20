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

import Ajv, { JSONSchemaType } from "ajv";
import inquirer, { DistinctQuestion, QuestionMap } from "inquirer";

const NAME = "NAME";

const ajv = new Ajv();

const validateBooleanPrompt = ajv.compile({
  type: "object",
  properties: {
    [NAME]: { type: "boolean" },
  },
  required: [NAME],
});

const validateStringPrompt = ajv.compile({
  type: "object",
  properties: {
    [NAME]: { type: "string" },
  },
  required: [NAME],
});

const arrayOfStringsSchema: JSONSchemaType<{ [NAME]: Array<string> }> = {
  type: "object",
  properties: {
    [NAME]: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [NAME],
};

const validateArrayOfStringsPrompt = ajv.compile(arrayOfStringsSchema);

const prompt = async <T, U extends { [NAME]: T }>(
  type: keyof QuestionMap<U>,
  validate: (result: unknown) => result is U,
  question: DistinctQuestion
): Promise<T> => {
  const result: unknown = await inquirer.prompt([
    { ...question, type, name: NAME },
  ]);

  if (validate(result)) {
    return result[NAME];
  }

  throw new Error("Prompt error");
};

export const confirm = (
  question: DistinctQuestion & { message: string }
): Promise<boolean> => prompt("confirm", validateBooleanPrompt, question);

export const input = (
  question: DistinctQuestion & { message: string }
): Promise<string> => prompt("input", validateStringPrompt, question);

export const list = (
  question: DistinctQuestion & { choices: Array<string>; message: string }
): Promise<string> => prompt("list", validateStringPrompt, question);

export const checkboxes = (
  question: DistinctQuestion & {
    choices: Array<{ name: string; checked?: boolean; disabled?: boolean }>;
    message: string;
  }
): Promise<Array<string>> =>
  prompt("checkbox", validateArrayOfStringsPrompt, question);
