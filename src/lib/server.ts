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
import type { Fn, Objects, Pipe, Unions } from "hotscript";
import open from "open";

import { commandObj } from "./commandObj.js";

const PORT = 5173;

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
      commandObj.logToStderr(`Server started on http://localhost:${PORT}`);
      void open(`http://localhost:${PORT}`);
      res(true);
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
    sendResultBack = res;
    currentClientResponse?.();
  });
}

type Steps = Record<
  string,
  {
    name: string;
    dataForEthersJs: string;
  }
>;

type CreateTransactionArgs<T extends Steps> = {
  name: string;
  steps: T;
};

interface Sus extends Fn {
  return: [this["arg0"][0], () => Promise<string>];
}

export function createTransactions<T extends Steps>(
  args: CreateTransactionArgs<T>,
): Pipe<T, [Objects.Entries, Unions.Map<Sus>, Objects.FromEntries]> {
  // @ts-expect-error don't know how to fix this
  return Object.fromEntries(
    Object.entries(args.steps).map(([name, data], i, arr) => {
      return [
        name,
        () => {
          function transactionEvent() {
            return sendEvent({
              tag: "transaction",
              data: {
                name: args.name,
                steps: arr.map(([, v]) => {
                  return v.name;
                }),
                currentStep: i,
                data: data.dataForEthersJs,
              },
            });
          }

          if (i === arr.length - 1) {
            return (async () => {
              const res = await transactionEvent();

              await sendEvent({
                tag: "success",
                data: {
                  name: args.name,
                },
              });

              return res;
            })();
          }

          return transactionEvent();
        },
      ];
    }),
  );
}
