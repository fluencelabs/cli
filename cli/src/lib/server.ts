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
      CLI_CONNECTOR_DIR_NAME,
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
