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

import assert from "node:assert";

import type { JSONSchemaType, ValidateFunction } from "ajv";
import inquirer, { DistinctQuestion, QuestionMap } from "inquirer";

import { ajv } from "./ajv";

const NAME = "NAME";

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
  validate: ValidateFunction<{ NAME: T }>,
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

type ListOptions<T, U> = {
  choices: T;
  message: string;
  oneChoiceMessage: (choice: string) => string;
  onNoChoices: () => U;
};

export async function list<T, U>(
  options: ListOptions<Array<{ value: T; name: string }>, U>
): Promise<T | U>;
export async function list<T extends string, U>(
  options: ListOptions<Array<T>, U>
): Promise<T | U>;
export async function list<T, U>({
  choices,
  message, // this is shown in case there are 2 or more items in a list
  oneChoiceMessage, // use confirm for list of one item
  onNoChoices, // do something if list is empty
}: ListOptions<
  T extends string ? Array<T> : Array<{ value: T; name: string }>,
  U
>): Promise<T | U> {
  if (choices.length === 0) {
    return onNoChoices();
  }

  const choicesToUse = choices.map((choice): { name: string; value: T } =>
    typeof choice === "string" ? { name: choice, value: choice } : choice
  );
  const firstChoice = choicesToUse[0];
  if (choicesToUse.length === 1 && firstChoice !== undefined) {
    const doConfirm = await confirm({
      message: oneChoiceMessage(firstChoice.name),
    });
    if (doConfirm) {
      return firstChoice.value;
    }
    return onNoChoices();
  }

  const stringChoice = await prompt("list", validateStringPrompt, {
    message,
    choices: choicesToUse,
  });

  const choice = choicesToUse.find(
    (choice): boolean => choice.name === stringChoice
  );

  assert(choice !== undefined);

  return choice.value;
}

export const checkboxes = async <T, U>({
  choices,
  message, // this is shown in case there are 2 or more items in a list
  oneChoiceMessage, // use confirm for list of one item
  onNoChoices, // do something if list is empty
}: {
  choices: Array<{
    value: T;
    name: string;
    checked?: boolean;
    disabled?: boolean;
  }>;
  message: string;
  oneChoiceMessage: (choice: string) => string;
  onNoChoices: () => U;
}): Promise<Array<T> | U> => {
  if (choices.length === 0) {
    return onNoChoices();
  }

  const firstChoice = choices[0];
  if (choices.length === 1 && firstChoice !== undefined) {
    const doConfirm = await confirm({
      message: oneChoiceMessage(firstChoice.name),
    });
    if (doConfirm) {
      return [firstChoice.value];
    }
    return [];
  }

  const stringChoices = await prompt("checkbox", validateArrayOfStringsPrompt, {
    message,
    choices: choices.map(({ name }): string => name),
  });

  return choices
    .filter(({ name }): boolean => stringChoices.includes(name))
    .map(({ value }): T => value);
};
