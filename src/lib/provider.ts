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
import color from "@oclif/color";
// eslint-disable-next-line node/no-missing-import
import type { IQRCodeModal } from "@walletconnect/types";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { BytesLike, ethers, providers } from "ethers";

import {
  DEAL_CONFIG,
  ChainNetwork,
  CommandObj,
  CHAIN_NETWORKS,
  isChainNetwork,
  NETWORK_FLAG_NAME,
} from "./const";
import { list } from "./prompt";

class WalletConnectModal implements IQRCodeModal {
  open(uri: string): void {
    console.log(
      // TODO: add actual url
      "You need to open the following URI in your wallet or on this website (https://todo)."
    );

    console.log(uri);
  }
  close(): void {
    console.log();
  }
}

type EnsureChainNetworkArg = {
  maybeChainNetwork: string;
  commandObj: CommandObj;
  isInteractive: boolean;
};

export const ensureChainNetwork = async ({
  maybeChainNetwork,
  commandObj,
  isInteractive,
}: EnsureChainNetworkArg): Promise<ChainNetwork> => {
  if (isChainNetwork(maybeChainNetwork)) {
    return maybeChainNetwork;
  }

  commandObj.warn(`Invalid chain network: ${maybeChainNetwork}`);

  const chainNetwork = await list({
    isInteractive,
    message: "Select chain network",
    options: [...CHAIN_NETWORKS],
    oneChoiceMessage(chainNetwork) {
      return `Do you want to use ${color.yellow(chainNetwork)} chain network?`;
    },
    onNoChoices() {
      return commandObj.error("No chain network selected");
    },
    flagName: NETWORK_FLAG_NAME,
  });

  return chainNetwork;
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
    rpc: {
      31_337: DEAL_CONFIG[network].ethereumNodeUrl,
    },
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
