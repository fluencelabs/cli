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

import {
  type FormData as FormDataType,
  type Headers as HeadersType,
  type Request as RequestType,
  type Response as ResponseType,
} from "undici";

declare global {
  // Re-export undici fetch function and various classes to global scope.
  // These are classes and functions expected to be at global scope according to Node.js v18 API
  // documentation.
  // See: https://nodejs.org/dist/latest-v18.x/docs/api/globals.html
  export const {
    FormData,
    Headers,
    Request,
    Response,
    fetch,
  }: typeof import("undici");

  type FormData = FormDataType;
  type Headers = HeadersType;
  type Request = RequestType;
  type Response = ResponseType;
}
