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

import color from "@oclif/color";
import type { JSONSchemaType, ValidateFunction } from "ajv";
import inquirer, { Answers, DistinctQuestion, Separator } from "inquirer";

import { ajv } from "./ajv";
import { IS_TTY, NO_INPUT_FLAG_NAME } from "./const";

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

type PromptOptions<T, U extends Answers> = DistinctQuestion<U> & {
  validateType: ValidateFunction<{ NAME: T }>;
  isInteractive: boolean;
  flagName: string | undefined;
};

const prompt = async <T, U extends { [NAME]: T }>({
  validateType,
  isInteractive,
  flagName,
  ...question
}: PromptOptions<T, U>): Promise<T> => {
  const promptMessageWarning =
    typeof question.message === "string"
      ? `\nPrompt message is: ${color.yellow(question.message)}`
      : "";

  const flagAdvice =
    flagName === undefined
      ? ""
      : `\nTry using ${color.yellow(
          `--${flagName}`
        )} flag and make sure you use it correctly.`;

  const advice = `${promptMessageWarning}${flagAdvice}`;

  if (!IS_TTY) {
    throw new Error(`Cannot prompt in non-interactive mode1.${advice}`);
  }

  if (!isInteractive) {
    throw new Error(
      `Can't prompt when in non-interactive mode or when ${color.yellow(
        `--${NO_INPUT_FLAG_NAME}`
      )} is set.${advice}`
    );
  }

  const result: unknown = await inquirer.prompt([{ ...question, name: NAME }]);

  if (validateType(result)) {
    return result[NAME];
  }

  throw new Error("Prompt error");
};

type ConfirmArg = DistinctQuestion & {
  isInteractive: boolean;
  message: string;
  flagName?: string | undefined;
};

export const confirm = ({
  isInteractive,
  flagName,
  ...question
}: ConfirmArg): Promise<boolean> =>
  prompt({
    ...question,
    type: "confirm",
    validateType: validateBooleanPrompt,
    isInteractive,
    flagName,
  });

type InputArg = DistinctQuestion & {
  isInteractive: boolean;
  message: string;
  flagName?: string | undefined;
};

export const input = ({
  isInteractive,
  flagName,
  ...question
}: InputArg): Promise<string> =>
  prompt({
    ...question,
    type: "input",
    validateType: validateStringPrompt,
    isInteractive,
    flagName,
  });

type SeparatorObj = InstanceType<typeof Separator>;

export type Choices<T> = [T] extends [string]
  ? Array<T | SeparatorObj>
  : Array<{ value: T; name: string } | SeparatorObj>;

type ListOptions<T, U> = DistinctQuestion & {
  options: Choices<T>;
  message: string;
  oneChoiceMessage: (choice: string) => string;
  onNoChoices: () => U;
  isInteractive: boolean;
  flagName?: string | undefined;
};

const handleList = async <T, U>(
  listOptions: Omit<ListOptions<T, U>, keyof DistinctQuestion>
): Promise<{
  choices: Array<{ value: T; name: string } | SeparatorObj>;
  result?: T | U;
}> => {
  const { options, oneChoiceMessage, onNoChoices, isInteractive, flagName } =
    listOptions;

  const choices = options.map(
    (choice): { name: string; value: T } | SeparatorObj =>
      choice instanceof Separator || typeof choice !== "string"
        ? choice
        : { name: choice, value: choice }
  );

  if (
    choices.filter((choice): boolean => !(choice instanceof Separator))
      .length === 0
  ) {
    return {
      result: onNoChoices(),
      choices,
    };
  }

  const firstChoice = choices[0];

  if (
    choices.length === 1 &&
    firstChoice !== undefined &&
    !(firstChoice instanceof Separator)
  ) {
    const doConfirm = await confirm({
      message: oneChoiceMessage(firstChoice.name),
      isInteractive,
      flagName,
    });

    if (doConfirm) {
      return {
        result: firstChoice.value,
        choices,
      };
    }

    return {
      result: onNoChoices(),
      choices,
    };
  }

  return {
    choices,
  };
};

export const list = async <T, U>(
  listOptions: ListOptions<T, U>
): Promise<T | U> => {
  const {
    options,
    oneChoiceMessage,
    onNoChoices,
    isInteractive,
    flagName,
    ...question
  } = listOptions;

  const { choices, result } = await handleList({
    options,
    oneChoiceMessage,
    onNoChoices,
    isInteractive,
    flagName,
  });

  if (result !== undefined) {
    return result;
  }

  const stringChoice = await prompt({
    ...question,
    type: "list",
    validateType: validateStringPrompt,
    choices: choices.map((choice): string | SeparatorObj =>
      choice instanceof Separator ? choice : choice.name
    ),
    isInteractive,
    flagName,
  });

  const choice = choices.find(
    (choice): boolean =>
      !(choice instanceof Separator) && choice.name === stringChoice
  );

  assert(choice !== undefined);
  assert(!(choice instanceof Separator));

  return choice.value;
};

export const checkboxes = async <T, U>(
  listOptions: ListOptions<T, U>
): Promise<Array<T | U>> => {
  const {
    options,
    oneChoiceMessage, // used for confirm in case the list contains only one item
    onNoChoices, // do something if list is empty
    isInteractive,
    flagName,
    ...question
  } = listOptions;

  const { choices, result } = await handleList({
    options,
    oneChoiceMessage,
    onNoChoices,
    isInteractive,
    flagName,
  });

  if (result !== undefined) {
    return [result];
  }

  const stringChoices = await prompt({
    ...question,
    type: "checkbox",
    validateType: validateArrayOfStringsPrompt,
    choices: choices.map((choice): string | SeparatorObj =>
      choice instanceof Separator ? choice : choice.name
    ),
    isInteractive,
    flagName,
  });

  const results: T[] = [];

  for (const choice of choices) {
    if (!(choice instanceof Separator) && stringChoices.includes(choice.name)) {
      results.push(choice.value);
    }
  }

  return results;
};
