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

/**
 * Makes all properties in the object to be NOT readonly
 * Doesn't work recursively
 *
 * @example
 * const readonlyObject: Readonly<{a: number}> = { a: 1 };
 * const mutableObject: Mutable<typeof readonlyObject> = readonlyObject;
 * mutableObject.a = 2;
 */
export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

/**
 * Makes particular object properties to be required
 *
 * @example
 * const object: { a?: number, b?: string, c?: boolean } = {};
 * const requiredObject: WithRequired<typeof object, "a" | "b"> = { a: 1, b: "b" };
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Required<T> = WithRequired<T, keyof T>;

export type Flags<T extends string> = Record<
  T,
  string | number | boolean | Array<string | undefined>
>;

export type OptionalFlags<T extends string> = Partial<
  Record<T, string | number | boolean | undefined | Array<string | undefined>>
>;

/**
 * Useful for debugging. Merges any compound type into a final flat object type
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
