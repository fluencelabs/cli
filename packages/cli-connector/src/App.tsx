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

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  type CLIToConnectorFullMsg,
  type TransactionPayload,
  type ConnectorToCLIMessage,
  jsonParse,
  jsonStringify,
  LOCAL_NET_WALLET_KEYS,
  CHAIN_IDS,
} from "@repo/common";
import { useEffect, useRef, useState } from "react";
import {
  useClient,
  useSendTransaction,
  useSwitchChain,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";

export function App() {
  const { isConnected, address } = useAccount();
  const { chain } = useClient();
  const { switchChain } = useSwitchChain();
  const [isExpectingAddress, setIsExpectingAddress] = useState(false);
  const [isCLIConnected, setIsCLIConnected] = useState(true);
  const [isReturnToCLI, setIsReturnToCLI] = useState(false);

  const [transactionPayload, setTransactionPayload] =
    useState<TransactionPayload | null>(null);

  const {
    sendTransaction,
    isPending,
    isError,
    error,
    data: txHash,
    reset,
  } = useSendTransaction();

  useEffect(() => {
    if (isExpectingAddress && address !== undefined) {
      setIsExpectingAddress(false);
      respond({ tag: "address", address });
    }
  }, [address, isExpectingAddress]);

  const CLIDisconnectedTimeout = useRef<number>();
  const gotFirstMessage = useRef(false);

  useEffect(() => {
    const events = new EventSource("/events");

    events.onmessage = ({ data }) => {
      // We are sure CLI returns what we expect so there is no need to validate
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const { chainId, msg } = jsonParse(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        data as string,
      ) as CLIToConnectorFullMsg;

      if (chainId !== chain.id) {
        reset();
        switchChain({ chainId });
      }

      if (msg.tag !== "ping") {
        setIsReturnToCLI(false);
      }

      if (msg.tag === "address") {
        setIsExpectingAddress(true);
      } else if (msg.tag === "previewTransaction") {
        gotFirstMessage.current = true;
        reset();
        setTransactionPayload(msg.payload);
      } else if (msg.tag === "sendTransaction") {
        reset();

        if (!gotFirstMessage.current) {
          gotFirstMessage.current = true;
          setTransactionPayload(msg.payload);
        } else {
          // @ts-expect-error Here we assume that viem and ethers types are compatible, we will have to fix if some incompatibility arises
          sendTransaction(msg.payload.transactionData);
        }
      } else if (msg.tag === "ping") {
        setIsCLIConnected(true);
        clearTimeout(CLIDisconnectedTimeout.current);

        CLIDisconnectedTimeout.current = window.setTimeout(() => {
          setIsCLIConnected(false);
        }, 3000);
        // We disable this rule so it's possible to rely on TypeScript to make sure we handle all the messages
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (msg.tag === "returnToCLI") {
        setIsReturnToCLI(true);
      } else {
        const never: never = msg;
        throw new Error(
          `Unreachable. Received unknown message: ${jsonStringify(never)}`,
        );
      }
    };
  }, [chain.id, reset, sendTransaction, switchChain]);

  const {
    data: txReceipt,
    isLoading,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const messageSentGuard = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      txHash !== undefined &&
      txReceipt !== undefined &&
      !messageSentGuard.current.has(txHash)
    ) {
      messageSentGuard.current.add(txHash);
      respond({ tag: "transactionSuccess", txHash });
    }
  }, [txHash, txReceipt]);

  if (!isCLIConnected) {
    return <h1>CLI is disconnected. Return to your terminal</h1>;
  }

  if (isReturnToCLI) {
    return <h1>Return to your terminal in order to continue</h1>;
  }

  const isSendTxButtonEnabled = !isPending && !isLoading && !isSuccess;

  return (
    <>
      {isConnected && <p>Chain: {chain.name}</p>}
      {chain.id === CHAIN_IDS.local && (
        <details>
          <summary>How to work with local chain</summary>
          <ol>
            <li>
              Import one one of the accounts to your wallet (e.g. in Metamask:
              Select an account - Add account or hardware wallet - Import
              account)
              <details>
                <summary>Local wallet keys</summary>
                {LOCAL_NET_WALLET_KEYS.map((key) => {
                  return (
                    <>
                      <br />
                      {key}
                    </>
                  );
                })}
              </details>
            </li>
            <li>
              After restarting local environment you should clear activity tab
              data (e.g. in Metamask: Settings - Advanced - Clear activity tab
              data)
            </li>
          </ol>
        </details>
      )}
      {transactionPayload !== null && isConnected && (
        <h1>{transactionPayload.title}</h1>
      )}
      <ConnectButton
        chainStatus={{
          largeScreen: "none",
          smallScreen: "none",
        }}
      />
      {isConnected && (
        <>
          {transactionPayload !== null && (
            <button
              type="button"
              className={`sendTransactionButton${isSendTxButtonEnabled ? "" : " sendTransactionButton_disabled"}`}
              onClick={() => {
                if (isSendTxButtonEnabled) {
                  respond({ tag: "sendTransaction" });
                }
              }}
            >
              Send transaction
            </button>
          )}
          {isPending && <div>Please sign transaction in your wallet</div>}
          {isLoading && <div>Waiting for transaction receipt...</div>}
          {isSuccess &&
            txHash !== undefined &&
            (chain.id === CHAIN_IDS.local ? (
              <div>Transaction successful!</div>
            ) : (
              <a
                href={`${chain.blockExplorers.default.url}tx${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Transaction successful!
              </a>
            ))}
          {isError && <div className="error">Error! {error.message}</div>}
          {transactionPayload !== null && (
            <details>
              <summary>Transaction details</summary>
              <pre>{transactionPayload.debugInfo}</pre>
            </details>
          )}
        </>
      )}
    </>
  );
}

function respond(response: ConnectorToCLIMessage) {
  void fetch("/response", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: jsonStringify(response),
  });
}
