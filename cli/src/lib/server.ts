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

import { access } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import express from "express";

import {
  jsonStringify,
  jsonReviver,
  type CLIToConnectorMsg,
  type CLIToConnectorFullMsg,
  type TransactionPayload,
  type ConnectorToCLIMessageTransactionSuccess,
  type ConnectorToCLIMessageAddress,
  type ConnectorToCLIMessageSendTransaction,
} from "../common.js";

import { getChainId } from "./chain/chainId.js";
import { commandObj } from "./commandObj.js";
import { CLI_CONNECTOR_DIR_NAME } from "./const.js";
import { numToStr } from "./helpers/typesafeStringify.js";

const PORT = 5172;
const SERVER_URL = `http://localhost:${numToStr(PORT)}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let clientEventResponse:
  | Parameters<Parameters<ReturnType<typeof express>["get"]>[1]>[1]
  | null = null;

/**
 * The current "question" frontend must answer so CLI can continue
 */
let currentClientResponse: (() => void) | null = null;
/**
 * Resolves the Promise with the answer to the "question" and allows the CLI to continue
 */
let sendResultBack: ((result: unknown) => void) | null = null;

async function initServer() {
  const cliConnectorPath = await resolveCliConnectorPath();

  return new Promise((res) => {
    const app = express();
    app.use(express.json({ reviver: jsonReviver }));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(cliConnectorPath));

    app.get("/events", (_, response) => {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });

      clientEventResponse = response;
      currentClientResponse?.();
    });

    app.post("/response", (req, res) => {
      // continue when got response from client
      sendResultBack?.(req.body);

      // we must answer to POST request so it doesn't hang
      res.status(200).send({
        message: "Data received successfully",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        receivedData: req.body,
      });
    });

    app.listen(PORT, () => {
      res(true);

      setInterval(() => {
        ping();
      }, 1000);
    });
  });
}

async function resolveCliConnectorPath() {
  const monorepoCliConnectorPath = resolve(
    __dirname,
    "..",
    "..",
    "..",
    "packages",
    CLI_CONNECTOR_DIR_NAME,
    "dist",
  );

  try {
    await access(monorepoCliConnectorPath);
    return monorepoCliConnectorPath;
  } catch {
    const packedCliConnectorPath = resolve(
      __dirname,
      "..",
      "..",
      "packages",
      CLI_CONNECTOR_DIR_NAME,
      "dist",
    );

    try {
      await access(packedCliConnectorPath);
    } catch {
      throw new Error(
        `Can't find cli-connector. Make sure CLI is built correctly. Looked at:\n${[monorepoCliConnectorPath, packedCliConnectorPath].join("\n")}`,
      );
    }

    return packedCliConnectorPath;
  }
}

async function sendEventAndWaitForResponse(msg: CLIToConnectorMsg) {
  currentClientResponse = () => {
    void sendEvent(msg);
  };

  return new Promise((res) => {
    sendResultBack = (value: unknown) => {
      res(value);
    };

    currentClientResponse?.();
  });
}

let isServerInitialized = false;

async function sendEvent(msg: CLIToConnectorMsg) {
  if (!isServerInitialized) {
    await initServer();
    isServerInitialized = true;
  }

  const chainId = await getChainId();
  const cliToConnectorFullMsg: CLIToConnectorFullMsg = { chainId, msg };

  clientEventResponse?.write(
    `data: ${jsonStringify(cliToConnectorFullMsg, true)}\n\n`,
  );
}

export async function createTransaction(
  getPayload: () => Promise<TransactionPayload>,
): Promise<ConnectorToCLIMessageTransactionSuccess> {
  const payload = await getPayload();

  commandObj.logToStderr(
    `Visit ${SERVER_URL} to sign "${payload.name}" transaction`,
  );

  // First we just show transaction to the user
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let resp = (await sendEventAndWaitForResponse({
    tag: "previewTransaction",
    payload,
  })) as
    | ConnectorToCLIMessageSendTransaction
    | ConnectorToCLIMessageTransactionSuccess;

  // Then we try until frontend successfully signs the transaction and sends tx hash back
  while (resp.tag !== "transactionSuccess") {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    resp = (await sendEventAndWaitForResponse({
      tag: "sendTransaction",
      payload: await getPayload(),
    })) as
      | ConnectorToCLIMessageSendTransaction
      | ConnectorToCLIMessageTransactionSuccess;
  }

  return resp;
}

let addressFromConnector: string | null = null;

export async function getAddressFromConnector(): Promise<string> {
  if (typeof addressFromConnector === "string") {
    return addressFromConnector;
  }

  commandObj.logToStderr(
    `Fluence CLI needs to know your wallet address in order to continue. Visit ${SERVER_URL} to connect your wallet`,
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const { address } = (await sendEventAndWaitForResponse({
    tag: "address",
  })) as ConnectorToCLIMessageAddress;

  addressFromConnector = address;
  return addressFromConnector;
}

export async function returnToCLI() {
  if (isServerInitialized) {
    await sendEventAndWaitForResponse({ tag: "returnToCLI" });
  }
}

function ping() {
  void sendEvent({ tag: "ping" });
}
