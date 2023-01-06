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
import { BytesLike, ethers, providers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import type { IQRCodeModal } from "@walletconnect/types";
import { DEAL_CONFIG, ChainNetwork } from "./const";

class WalletConnectModal implements IQRCodeModal {
  open(uri: string, _: any, __?: any): void {
    console.log(
      "You need to open the following URI in your wallet or on this website (https://todo)."
    );
    console.log(uri);
  }
  close(): void {}
}

const provider = new WalletConnectProvider({
  rpc: {
    31337: DEAL_CONFIG[ChainNetwork.Local]!.ethereumNodeUrl,
  },
  qrcode: true,
  qrcodeModal: new WalletConnectModal(),
});

export const getSigner = async (
  network: ChainNetwork,
  privKey: BytesLike | undefined
): Promise<ethers.Signer> => {
  return privKey ? getWallet(privKey, network) : getWalletConnectProvider();
};

const getWalletConnectProvider = async (): Promise<ethers.Signer> => {
  await provider.enable();

  return new providers.Web3Provider(provider).getSigner();
};

const getWallet = (
  privKey: BytesLike,
  network: ChainNetwork
): ethers.Wallet => {
  return new ethers.Wallet(
    privKey,
    new providers.JsonRpcProvider(DEAL_CONFIG[network]!.ethereumNodeUrl)
  );
};

export const getCoreContract = (
  signer: ethers.Signer,
  network: ChainNetwork
): Core => Core__factory.connect(DEAL_CONFIG[network]!.coreAddress, signer);

export const getFactoryContract = (
  signer: ethers.Signer,
  network: ChainNetwork
): DealFactory =>
  DealFactory__factory.connect(
    DEAL_CONFIG[network]!.dealFactoryAddress,
    signer
  );

export const getAquaProxy = (
  address: string,
  provider: ethers.providers.Provider
): AquaProxy => AquaProxy__factory.connect(address, provider);

export const getDeveloperContract = (
  signer: ethers.Signer,
  network: ChainNetwork
): DeveloperFaucet =>
  DeveloperFaucet__factory.connect(
    DEAL_CONFIG[network]!.developerFaucetAddress,
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
