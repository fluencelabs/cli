/**
 * Copyright 2022 Fluence Labs Limited
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
  AquaProxy,
  AquaProxy__factory,
  Core,
  Core__factory,
  Deal,
  DealFactory,
  DealFactory__factory,
  Deal__factory,
  DeveloperFaucet,
  DeveloperFaucet__factory,
  ERC20,
  ERC20__factory,
} from "@fluencelabs/deal-aurora";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { IQRCodeModal } from "@walletconnect/types";
import walletconnect from "@walletconnect/web3-provider";
const WalletConnectProvider = walletconnect.default;
import { BytesLike, ethers, providers } from "ethers";

import { commandObj } from "./commandObj.js";
import {
  DEAL_CONFIG,
  ChainNetwork,
  CHAIN_NETWORKS,
  isChainNetwork,
  NETWORK_FLAG_NAME,
  CLI_CONNECTOR_URL,
  DEAL_RPC_CONFIG,
} from "./const.js";
import { list } from "./prompt.js";

const WC_QUERY_PARAM_NAME = "wc";
const BRIDGE_QUERY_PARAM_NAME = "bridge";
const KEY_QUERY_PARAM_NAME = "key";

class WalletConnectModal implements IQRCodeModal {
  open(connectionString: string): void {
    const connectionStringUrl = new URL(connectionString);
    const wc = connectionStringUrl.pathname;

    const bridge = connectionStringUrl.searchParams.get(
      BRIDGE_QUERY_PARAM_NAME
    );

    assert(typeof bridge === "string");
    const key = connectionStringUrl.searchParams.get(KEY_QUERY_PARAM_NAME);
    assert(typeof key === "string");
    const url = new URL(CLI_CONNECTOR_URL);
    url.searchParams.set(WC_QUERY_PARAM_NAME, wc);
    url.searchParams.set(BRIDGE_QUERY_PARAM_NAME, bridge);
    url.searchParams.set(KEY_QUERY_PARAM_NAME, key);

    commandObj.log(
      `To approve transactions with your to your wallet using metamask, open the following url:\n\n${url.toString()}\n\nor go to ${CLI_CONNECTOR_URL} and enter the following connection string there:\n\n${connectionString}`
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close(): void {}
}

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
    commandObj.warn(`Invalid chain network: ${String(maybeNetworkFromFlags)}`);
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
  const provider = new WalletConnectProvider({
    rpc: DEAL_RPC_CONFIG,
    chainId: DEAL_CONFIG[network].chainId,
    qrcode: true,
    qrcodeModal: new WalletConnectModal(),
  });

  await provider.enable();
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
