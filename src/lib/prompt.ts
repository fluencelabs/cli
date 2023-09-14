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

import assert from "node:assert";

import { color } from "@oclif/color";
import type { JSONSchemaType, ValidateFunction } from "ajv";
import type inquirer from "inquirer";
import type { Answers, DistinctQuestion } from "inquirer";

import { ajv } from "./ajvInstance.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { IS_TTY, NO_INPUT_FLAG_NAME } from "./const.js";

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

export const validatePositiveNumber = (input: unknown): true | string => {
  const parsed = Number(input);

  if (Number.isNaN(parsed)) {
    return "Must be a number";
  }

  if (parsed <= 0) {
    return "Must be a positive number";
  }

  return true;
};

const validateArrayOfStringsPrompt = ajv.compile(arrayOfStringsSchema);

type PromptOptions<T, U extends Answers> = DistinctQuestion<U> & {
  validateType: ValidateFunction<{ NAME: T }>;
  flagName: string | undefined;
};

const prompt = async <T, U extends Answers>({
  validateType,
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
          `--${flagName}`,
        )} flag and make sure you use it correctly.`;

  const advice = `${promptMessageWarning}${flagAdvice}`;

  if (!IS_TTY) {
    return commandObj.error(`Cannot prompt in non-interactive mode.${advice}`);
  }

  if (!isInteractive) {
    return commandObj.error(
      `Can't prompt when in non-interactive mode or when ${color.yellow(
        `--${NO_INPUT_FLAG_NAME}`,
      )} is set.${advice}`,
    );
  }

  const inquirer = (await import("inquirer")).default;
  const result: unknown = await inquirer.prompt([{ ...question, name: NAME }]);

  if (validateType(result)) {
    return result[NAME];
  }

  throw new Error("Unreachable. Prompt error");
};

type ConfirmArg = DistinctQuestion & {
  message: string;
  flagName?: string | undefined;
};

export const confirm = ({
  flagName,
  ...question
}: ConfirmArg): Promise<boolean> => {
  // inquirer broke it's types so we have to cast it. "confirm" always returns boolean
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return prompt({
    ...question,
    message: `${question.message}:`,
    type: "confirm",
    validateType: validateBooleanPrompt,
    flagName,
  }) as Promise<boolean>;
};

export type InputArg = DistinctQuestion & {
  message: string;
  allowEmpty?: boolean | undefined;
  flagName?: string | undefined;
};

export const input = ({
  flagName,
  allowEmpty = false,
  ...question
}: InputArg): Promise<string> => {
  // inquirer broke it's types so we have to cast it. "input" always returns string
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return prompt({
    ...question,
    validate: async (value: string) => {
      if (!allowEmpty && value === "") {
        return "Must not be empty";
      }

      return question.validate === undefined
        ? true
        : await question.validate(value);
    },
    message: `${question.message}:`,
    type: "input",
    validateType: validateStringPrompt,
    flagName,
  }) as Promise<string>;
};

type PasswordArg = DistinctQuestion & {
  message: string;
  allowEmpty?: boolean | undefined;
  flagName?: string | undefined;
};

export const password = ({
  flagName,
  allowEmpty = false,
  ...question
}: PasswordArg): Promise<string> => {
  // inquirer broke it's types so we have to cast it. "password" always returns string
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return prompt({
    ...question,
    validate: async (value: string) => {
      if (!allowEmpty && value === "") {
        return "Must not be empty";
      }

      return question.validate === undefined
        ? true
        : await question.validate(value);
    },
    type: "password",
    validateType: validateStringPrompt,
    flagName,
  }) as Promise<string>;
};

type Separator = typeof inquirer.Separator;
type SeparatorObj = InstanceType<Separator>;

export type Choices<T> = [T] extends [string]
  ? Array<T | SeparatorObj>
  : Array<{ value: T; name: string } | SeparatorObj>;

type ListOptions<T, U> = DistinctQuestion & {
  /**
   * Choices to choose from
   * can be either an array of strings or an array of objects with `value` and `name` properties
   */
  options: Choices<T>;
  /**
   * Message to print to when there are multiple choices
   */
  message: string;
  /**
   * Runs when there is only one choice
   * @param {string} choice - the only choice
   * @returns a message to print to the user when there is only one choice
   */
  oneChoiceMessage: (choice: string) => string;
  /**
   * Runs when there are no choices and if there was one choice and user refused to use it
   * @returns value to return if there are no choices
   */
  onNoChoices: () => U;
  /**
   * Flag name to use if user can't be prompted because he uses cli in non-interactive mode
   */
  flagName?: string | undefined;
};

const handleList = async <T, U>(
  listOptions: Omit<ListOptions<T, U>, keyof DistinctQuestion>,
): Promise<{
  choices: Array<{ value: T; name: string } | SeparatorObj>;
  result?: T;
  noChoicesResult?: U;
}> => {
  const { options, oneChoiceMessage, onNoChoices, flagName } = listOptions;
  const inquirer = (await import("inquirer")).default;

  const choices = options.map(
    (choice): { name: string; value: T } | SeparatorObj => {
      return choice instanceof inquirer.Separator || typeof choice !== "string"
        ? choice
        : { name: choice, value: choice };
    },
  );

  if (
    choices.filter((choice): boolean => {
      return !(choice instanceof inquirer.Separator);
    }).length === 0
  ) {
    return {
      noChoicesResult: onNoChoices(),
      choices,
    };
  }

  const firstChoice = choices[0];

  if (
    choices.length === 1 &&
    firstChoice !== undefined &&
    !(firstChoice instanceof inquirer.Separator)
  ) {
    const doConfirm = await confirm({
      message: oneChoiceMessage(firstChoice.name),
      flagName,
    });

    if (doConfirm) {
      return {
        result: firstChoice.value,
        choices,
      };
    }

    return {
      noChoicesResult: onNoChoices(),
      choices,
    };
  }

  return {
    choices,
  };
};

export const list = async <T, U>(
  listOptions: ListOptions<T, U>,
): Promise<T | U> => {
  const { options, oneChoiceMessage, onNoChoices, flagName, ...question } =
    listOptions;

  const { choices, result, noChoicesResult } = await handleList({
    options,
    oneChoiceMessage,
    onNoChoices,
    flagName,
  });

  if (result !== undefined) {
    return result;
  }

  if (noChoicesResult !== undefined) {
    return noChoicesResult;
  }

  const inquirer = (await import("inquirer")).default;

  // inquirer broke it's types so we have to cast it. "list" always returns string
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const stringChoice = (await prompt({
    ...question,
    type: "list",
    validateType: validateStringPrompt,
    choices: choices.map((choice): string | SeparatorObj => {
      return choice instanceof inquirer.Separator ? choice : choice.name;
    }),
    flagName,
  })) as string;

  const choice = choices.find((choice): boolean => {
    return (
      !(choice instanceof inquirer.Separator) && choice.name === stringChoice
    );
  });

  assert(choice !== undefined);
  assert(!(choice instanceof inquirer.Separator));

  return choice.value;
};

export const checkboxes = async <T, U>(
  listOptions: ListOptions<T, U>,
): Promise<Array<T> | U> => {
  const {
    options,
    oneChoiceMessage, // used for confirm in case the list contains only one item
    onNoChoices, // do something if list is empty
    flagName,
    ...question
  } = listOptions;

  const { choices, result, noChoicesResult } = await handleList({
    options,
    oneChoiceMessage,
    onNoChoices,
    flagName,
  });

  if (result !== undefined) {
    return [result];
  }

  if (noChoicesResult !== undefined) {
    return noChoicesResult;
  }

  const inquirer = (await import("inquirer")).default;

  const stringChoices = await prompt({
    ...question,
    type: "checkbox",
    validateType: validateArrayOfStringsPrompt,
    choices: choices.map((choice): string | SeparatorObj => {
      return choice instanceof inquirer.Separator ? choice : choice.name;
    }),
    flagName,
  });

  const results: T[] = [];

  for (const choice of choices) {
    if (
      !(choice instanceof inquirer.Separator) &&
      stringChoices.includes(choice.name)
    ) {
      results.push(choice.value);
    }
  }

  return results;
};
