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

import core from "@actions/core";
import { test } from "vitest";

export const sleepSeconds = (s: number) => {
  return new Promise<void>((resolve) => {
    return setTimeout(resolve, s * 1000);
  });
};

export function wrappedTest(
  name: string,
  fn: (
    context: Parameters<NonNullable<Parameters<typeof test>[2]>>[0],
  ) => Promise<void>,
) {
  test(name, async (...args) => {
    core.startGroup(name);
    await fn(...args);
    core.endGroup();
  });
}
