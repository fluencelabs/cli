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

import { createRequire } from "module";
import { dirname, join } from "path";

import express from "express";
import open from "open";

import { commandObj } from "./commandObj.js";

const PORT = 5173;
const SERVER_URL = `http://localhost:${PORT}`;

const require = createRequire(import.meta.url);

let clientEventResponse:
  | Parameters<Parameters<ReturnType<typeof express>["get"]>[1]>[1]
  | null = null;

let currentClientResponse: (() => void) | null = null;
let sendResultBack: ((result: unknown) => void) | null = null;

function initServer() {
  return new Promise((res) => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(
      express.static(join(dirname(require.resolve("../versions")), "public")),
    );

    app.get("/events", (_, response) => {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });

      clientEventResponse = response;
      currentClientResponse?.();
    });

    app.post("/response", (req) => {
      sendResultBack?.(req.body);
    });

    app.listen(PORT, () => {
      void open(SERVER_URL).then(() => {
        commandObj.logToStderr(`Server started on ${SERVER_URL}`);
        res(true);
      });
    });
  });
}

let isServerInitialized = false;

async function sendEvent(dataToSend: unknown) {
  if (!isServerInitialized) {
    await initServer();
    isServerInitialized = true;
  }

  currentClientResponse = () => {
    clientEventResponse?.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
  };

  return new Promise((res) => {
    sendResultBack = (value: unknown) => {
      res(value);
    };

    currentClientResponse?.();
  });
}

type CreateTransactionArgs = {
  name: string;
  transactionData: string;
};

export async function createTransaction(
  data: CreateTransactionArgs,
): Promise<string> {
  const res = await sendEvent({ tag: "transaction", data });
  return JSON.stringify(res);
}
