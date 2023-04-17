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

/* eslint-disable camelcase */

import assert from "node:assert";
import { URL } from "node:url";

import {
  type AquaProxy,
  type Core,
  type Deal,
  type DealFactory,
  type DeveloperFaucet,
  type ERC20,
  AquaProxy__factory,
  Core__factory,
  DealFactory__factory,
  Deal__factory,
  DeveloperFaucet__factory,
  ERC20__factory,
} from "@fluencelabs/deal-aurora";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { UniversalProvider } from "@walletconnect/universal-provider";
import { type BytesLike, ethers, providers } from "ethers";

import { commandObj } from "./commandObj.js";
import {
  type ChainNetwork,
  DEAL_CONFIG,
  CHAIN_NETWORKS,
  isChainNetwork,
  NETWORK_FLAG_NAME,
  CLI_CONNECTOR_URL,
  DEAL_RPC_CONFIG,
  WC_PROJECT_ID,
  WC_METADATA,
} from "./const.js";
import { stringifyUnknown } from "./helpers/jsonStringify.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { list } from "./prompt.js";

const WC_QUERY_PARAM_NAME = "wc";
const RELAY_QUERY_PARAM_NAME = "relay-protocol";
const KEY_QUERY_PARAM_NAME = "symKey";

const DEFAULT_NETWORK = "testnet";

type EnsureChainNetworkArg = {
  maybeNetworkFromFlags: string | undefined;
  maybeDealsConfigNetwork: ChainNetwork | undefined;
};

export const ensureChainNetwork = async ({
  maybeNetworkFromFlags,
  maybeDealsConfigNetwork,
}: EnsureChainNetworkArg): Promise<ChainNetwork> => {
  const isValidNetworkFromFlags =
    isChainNetwork(maybeNetworkFromFlags) ||
    maybeNetworkFromFlags === undefined;

  if (!isValidNetworkFromFlags) {
    commandObj.warn(
      `Invalid chain network: ${stringifyUnknown(maybeNetworkFromFlags)}`
    );

    return list({
      message: "Select chain network",
      options: [...CHAIN_NETWORKS],
      oneChoiceMessage(chainNetwork) {
        return `Do you want to use ${color.yellow(
          chainNetwork
        )} chain network?`;
      },
      onNoChoices() {
        return commandObj.error("No chain network selected");
      },
      flagName: NETWORK_FLAG_NAME,
    });
  }

  const networkToUse =
    maybeNetworkFromFlags ?? maybeDealsConfigNetwork ?? DEFAULT_NETWORK;

  return networkToUse;
};

export const getSigner = async (
  network: ChainNetwork,
  privKey: BytesLike | undefined
): Promise<ethers.Signer> =>
  privKey === undefined
    ? getWalletConnectProvider(network)
    : getWallet(privKey, network);

const getWalletConnectProvider = async (
  network: ChainNetwork
): Promise<ethers.Signer> => {
  const provider = await UniversalProvider.init({
    projectId: WC_PROJECT_ID,
    metadata: WC_METADATA,
  });

  provider.on("display_uri", (uri: string) => {
    const connectionStringUrl = new URL(uri);
    const wc = connectionStringUrl.pathname;

    const bridge = connectionStringUrl.searchParams.get(RELAY_QUERY_PARAM_NAME);

    assert(typeof bridge === "string");
    const key = connectionStringUrl.searchParams.get(KEY_QUERY_PARAM_NAME);
    assert(typeof key === "string");
    const url = new URL(CLI_CONNECTOR_URL);
    url.searchParams.set(WC_QUERY_PARAM_NAME, wc);
    url.searchParams.set(RELAY_QUERY_PARAM_NAME, bridge);
    url.searchParams.set(KEY_QUERY_PARAM_NAME, key);

    commandObj.log(
      `To approve transactions to your wallet using metamask, open the following url:\n\n${url.toString()}\n\nor go to ${CLI_CONNECTOR_URL} and enter the following connection string there:\n\n${uri}\n`
    );
  });

  startSpinner(color.yellow("Connecting to wallet..."));

  const session = await provider.connect({
    namespaces: {
      eip155: {
        methods: [
          "eth_sendTransaction",
          "eth_signTransaction",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData",
        ],
        chains: [`eip155:${DEAL_CONFIG[network].chainId}`],
        events: ["chainChanged", "accountsChanged"],
        rpcMap: DEAL_RPC_CONFIG,
      },
    },
  });

  const walletAddress =
    session?.namespaces["eip155"]?.accounts[0]?.split(":")[2];

  if (walletAddress == null) {
    throw new Error("Wallet address is not defined");
  }

  stopSpinner(`\nWallet ${color.yellow(walletAddress)} connected`);

  return new providers.Web3Provider(provider).getSigner();
};

const getWallet = (privKey: BytesLike, network: ChainNetwork): ethers.Wallet =>
  new ethers.Wallet(
    privKey,
    new providers.JsonRpcProvider(DEAL_CONFIG[network].ethereumNodeUrl)
  );

export const getCoreContract = (
  signer: ethers.Signer,
  network: ChainNetwork
): Core => Core__factory.connect(DEAL_CONFIG[network].coreAddress, signer);

export const getFactoryContract = (
  signer: ethers.Signer,
  network: ChainNetwork
): DealFactory =>
  DealFactory__factory.connect(DEAL_CONFIG[network].dealFactoryAddress, signer);

export const getAquaProxy = (
  address: string,
  provider: ethers.providers.Provider
): AquaProxy => AquaProxy__factory.connect(address, provider);

export const getDeveloperContract = (
  signer: ethers.Signer,
  network: ChainNetwork
): DeveloperFaucet =>
  DeveloperFaucet__factory.connect(
    DEAL_CONFIG[network].developerFaucetAddress,
    signer
  );

export const getDealContract = (
  dealAddress: string,
  signer: ethers.Signer
): Deal => Deal__factory.connect(dealAddress, signer);

export const getUSDContract = async (
  signer: ethers.Signer,
  network: ChainNetwork
): Promise<ERC20> =>
  ERC20__factory.connect(
    await getDeveloperContract(signer, network).usdToken(),
    signer
  );

export const getFLTContract = async (
  signer: ethers.Signer,
  network: ChainNetwork
): Promise<ERC20> =>
  ERC20__factory.connect(
    await getDeveloperContract(signer, network).fluenceToken(),
    signer
  );

export const waitTx = async (
  tx: ethers.ContractTransaction
): Promise<ethers.ContractReceipt> => {
  startSpinner("Waiting for transaction to be mined...");

  const res = await tx.wait();
  stopSpinner();

  return res;
};

export const promptConfirmTx = (privKey: string | undefined) => {
  if (privKey === undefined) {
    commandObj.log(`Confirm transaction in your wallet...`);
  }
};
