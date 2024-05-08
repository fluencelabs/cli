/**
 * Copyright 2024 Fluence DAO
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
import { NO_INPUT_FLAG_NAME } from "./const.js";

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
  flagName?: string | undefined;
  argName?: string | undefined;
};

const prompt = async <T, U extends Answers>({
  validateType,
  flagName,
  argName,
  ...question
}: PromptOptions<T, U>): Promise<T> => {
  const promptMessageWarning =
    typeof question.message === "string"
      ? `\nPrompt message is: ${question.message}`
      : "";

  const flagNameAndArgName = [
    argName === undefined
      ? null
      : `Try using ${color.yellow(argName)} argument`,
    flagName === undefined
      ? null
      : `Try using ${color.yellow(`--${flagName}`)} flag`,
  ].filter(Boolean);

  const flagOrArgAdvice =
    flagNameAndArgName.length === 0
      ? ""
      : `\n${flagNameAndArgName.join(
          " or\n",
        )} and make sure you are using it correctly.`;

  if (!isInteractive) {
    if (question.default !== undefined) {
      const validity = await question.validate?.(question.default);

      if (typeof validity === "string") {
        throw new Error(
          `Default value is invalid. Please report it to Fluence team https://github.com/fluencelabs/cli/issues so we can fix this. Error\n${validity}`,
        );
      }

      // TODO: fix inquirer types so this part is type-checked
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return question.default;
    }

    return commandObj.error(
      `Can't prompt when in non-interactive mode or when ${color.yellow(
        `--${NO_INPUT_FLAG_NAME}`,
      )} is set.${promptMessageWarning}${flagOrArgAdvice}`,
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
  argName?: string | undefined;
};

export function confirm(question: ConfirmArg): Promise<boolean> {
  // inquirer broke it's types so we have to cast it. "confirm" always returns boolean
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return prompt({
    ...question,
    message: `${question.message}:`,
    type: "confirm",
    validateType: validateBooleanPrompt,
  }) as Promise<boolean>;
}

export type InputArg = DistinctQuestion & {
  message: string;
  flagName?: string | undefined;
};

export const input = (question: InputArg): Promise<string> => {
  // inquirer broke it's types so we have to cast it. "input" always returns string
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return prompt({
    ...question,
    validate: async (value: string) => {
      if (typeof question.default !== "string" && value === "") {
        return "Must not be empty";
      }

      return question.validate === undefined
        ? true
        : await question.validate(value);
    },
    message: `${question.message}:`,
    type: "input",
    validateType: validateStringPrompt,
  }) as Promise<string>;
};

type PasswordArg = DistinctQuestion & {
  message: string;
  flagName?: string | undefined;
};

export const password = (question: PasswordArg): Promise<string> => {
  // inquirer broke it's types so we have to cast it. "password" always returns string
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return prompt({
    ...question,
    validate: async (value: string) => {
      if (typeof question.default !== "string" && value === "") {
        return "Must not be empty";
      }

      return question.validate === undefined
        ? true
        : await question.validate(value);
    },
    type: "password",
    validateType: validateStringPrompt,
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
  /**
   * Arg name to use if user can't be prompted because he uses cli in non-interactive mode
   */
  argName?: string | undefined;
  default?: T;
};

const handleList = async <T, U>(
  listOptions: Omit<
    ListOptions<T, U>,
    Exclude<keyof DistinctQuestion, "default">
  >,
): Promise<{
  choices: Array<{ value: T; name: string } | SeparatorObj>;
  result?: T;
  noChoicesResult?: U;
}> => {
  const { options, oneChoiceMessage, onNoChoices, flagName, argName } =
    listOptions;

  const inquirer = (await import("inquirer")).default;

  function nameWithDefault(name: string) {
    if (name === listOptions.default) {
      return `${name} ${color.gray("(default)")}`;
    }

    return name;
  }

  const choices = options.map(
    (choice): { name: string; value: T } | SeparatorObj => {
      if (choice instanceof inquirer.Separator) {
        return choice;
      }

      return typeof choice === "string"
        ? { name: nameWithDefault(choice), value: choice }
        : { name: nameWithDefault(choice.name), value: choice.value };
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
      argName,
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
    // TODO: fix inquirer types so this part is type-checked
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: question.default,
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
      !(choice instanceof inquirer.Separator) &&
      // In non-interactive case default value might be returned
      (isInteractive ? choice.name : choice.value) === stringChoice
    );
  });

  assert(choice !== undefined && !(choice instanceof inquirer.Separator));
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
    argName,
    ...question
  } = listOptions;

  const { choices, result, noChoicesResult } = await handleList({
    options,
    oneChoiceMessage,
    onNoChoices,
    flagName,
    argName,
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
    argName,
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
