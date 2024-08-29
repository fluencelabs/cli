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

// In Firefox: client variable can be undefined - that's why we need to use optional chaining

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  type CLIToConnectorFullMsg,
  type TransactionPayload,
  type ConnectorToCLIMessage,
  jsonParse,
  jsonStringify,
  LOCAL_NET_WALLET_KEYS,
  CHAIN_IDS,
  ChainId,
} from "@repo/common";
import { useEffect, useMemo, useRef, useState } from "react";
import * as v from "valibot";
import {
  useClient,
  useSendTransaction,
  useSwitchChain,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";

const TransactionError = v.object({
  cause: v.object({
    cause: v.object({
      data: v.object({
        message: v.string(),
      }),
    }),
  }),
});

export function App({
  chainId,
  setChainId,
}: {
  chainId: ChainId;
  setChainId: (chainId: ChainId) => void;
}) {
  const { isConnected, address, chainId: accountChainId } = useAccount();
  const [addressUsedByCLI, setAddressUsedByCLI] = useState<string | null>(null);
  const client = useClient();
  const { switchChain, isPending: isSwitchChainPending } = useSwitchChain();
  const [isExpectingAddress, setIsExpectingAddress] = useState(false);
  const [isCLIConnected, setIsCLIConnected] = useState(true);
  const [isReturnToCLI, setIsReturnToCLI] = useState(false);

  const [wasSwitchChainDialogShown, setWasSwitchChainDialogShown] =
    useState(false);

  useEffect(() => {
    if (isSwitchChainPending && !wasSwitchChainDialogShown) {
      setWasSwitchChainDialogShown(true);
    }
  }, [isSwitchChainPending, wasSwitchChainDialogShown]);

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

  const txErrorString = useMemo(() => {
    const parsedError = v.safeParse(TransactionError, error);

    return parsedError.success
      ? parsedError.output.cause.cause.data.message
      : error?.message ?? "";
  }, [error]);

  const [trySwitchChainFlag, setTrySwitchChainFlag] = useState(false);

  const isCorrectChainIdSet =
    chainId === client?.chain.id && chainId === accountChainId;

  useEffect(() => {
    if (isCorrectChainIdSet) {
      setWasSwitchChainDialogShown(false);
    }

    if (wasSwitchChainDialogShown || isCorrectChainIdSet) {
      return;
    }

    // For some reason switchChain does not work if called immediately
    // So we try until user switches the chain cause we can't proceed until he does
    setTimeout(() => {
      switchChain({ chainId });

      setTrySwitchChainFlag((prev) => {
        return !prev;
      });
    }, 2000);
  }, [
    chainId,
    switchChain,
    trySwitchChainFlag,
    wasSwitchChainDialogShown,
    isCorrectChainIdSet,
  ]);

  const CLIDisconnectedTimeout = useRef<number>();
  const gotFirstMessage = useRef(false);
  const cliVersion = useRef<string | null>(null);

  useEffect(() => {
    const events = new EventSource("/events");

    events.onmessage = ({ data }) => {
      // We are sure CLI returns what we expect so there is no need to validate
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const { chainId: chainIdFromCLI, msg } = jsonParse(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        data as string,
      ) as CLIToConnectorFullMsg;

      if (chainId !== chainIdFromCLI) {
        setChainId(chainIdFromCLI);
      }

      if (msg.tag !== "ping") {
        reset();
        setIsReturnToCLI(false);
      }

      if (msg.tag === "address") {
        setIsExpectingAddress(true);
      } else if (msg.tag === "previewTransaction") {
        gotFirstMessage.current = true;
        setTransactionPayload(msg.payload);
      } else if (msg.tag === "sendTransaction") {
        if (!gotFirstMessage.current) {
          gotFirstMessage.current = true;
          setTransactionPayload(msg.payload);
        } else {
          // @ts-expect-error Here we assume that viem and ethers types are compatible, we will have to fix if some incompatibility arises
          sendTransaction(msg.payload.transactionData);
        }
      } else if (msg.tag === "ping") {
        if (cliVersion.current === null) {
          cliVersion.current = msg.CLIVersion;
        }

        if (cliVersion.current !== msg.CLIVersion) {
          // reload the page to get the latest frontend version
          window.location.href = window.location.href;
        }

        setAddressUsedByCLI(msg.addressUsedByCLI);
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
  }, [chainId, reset, sendTransaction, setChainId]);

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

  const hasSwitchedAccountDuringCommandExecution =
    addressUsedByCLI !== null &&
    address !== undefined &&
    addressUsedByCLI !== address;

  const isSendTxButtonEnabled =
    !isPending &&
    !isLoading &&
    !isSuccess &&
    !hasSwitchedAccountDuringCommandExecution;

  return (
    <>
      {isConnected && <p>Chain: {client?.chain.name}</p>}
      {client?.chain.id === CHAIN_IDS.local && (
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
      {hasSwitchedAccountDuringCommandExecution && (
        <div className="error">
          The account address sent to CLI when command execution started:
          {" \n"}
          <b>{addressUsedByCLI}</b> is different from the current account
          address:{" \n"}
          <b>{address}</b>. Please switch back to the{" \n"}
          <b>{addressUsedByCLI}</b> account or rerun the CLI command
        </div>
      )}
      {isConnected && address !== undefined && (
        <>
          {isExpectingAddress && (
            <button
              type="button"
              className="button"
              onClick={() => {
                setIsExpectingAddress(false);
                respond({ tag: "address", address });
              }}
            >
              Send account address to CLI
            </button>
          )}
          {transactionPayload !== null && isCorrectChainIdSet && (
            <button
              type="button"
              className={`button${isSendTxButtonEnabled ? "" : " button_disabled"}`}
              onClick={() => {
                if (isSendTxButtonEnabled) {
                  respond({ tag: "sendTransaction", address });
                }
              }}
            >
              Send transaction
            </button>
          )}
          {wasSwitchChainDialogShown && (
            <button
              type="button"
              className="button"
              onClick={() => {
                setWasSwitchChainDialogShown(false);
              }}
            >
              Switch chain
            </button>
          )}
          {isPending && <div>Please sign transaction in your wallet</div>}
          {isLoading && <div>Waiting for transaction receipt...</div>}
          {isSuccess &&
            txHash !== undefined &&
            (client?.chain.blockExplorers?.default.url === undefined ? (
              <div>Transaction successful!</div>
            ) : (
              <a
                href={`${client.chain.blockExplorers.default.url}tx${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Transaction successful!
              </a>
            ))}
          {isError && (
            <>
              <div className="error">Error: {txErrorString}</div>
              <details className="error">
                <summary>Error details:</summary>
                <pre>{jsonStringify(error)}</pre>
              </details>
            </>
          )}
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
