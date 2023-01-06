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
import { ethers } from "ethers";

import { DEAL_CONFIG } from "./const";

export const getWallet = (privKey: string): ethers.Wallet =>
  new ethers.Wallet(
    privKey,
    new ethers.providers.JsonRpcProvider(DEAL_CONFIG.ethereumNodeUrl)
  );

export const getCoreContract = (wallet: ethers.Wallet): Core =>
  Core__factory.connect(DEAL_CONFIG.coreAddress, wallet);

export const getFactoryContract = (wallet: ethers.Wallet): DealFactory =>
  DealFactory__factory.connect(DEAL_CONFIG.dealFactoryAddress, wallet);

export const getAquaProxy = (
  address: string,
  wallet: ethers.Wallet
): AquaProxy => AquaProxy__factory.connect(address, wallet);

export const getDeveloperContract = (wallet: ethers.Wallet): DeveloperFaucet =>
  DeveloperFaucet__factory.connect(DEAL_CONFIG.developerFaucetAddress, wallet);

export const getDealContract = (
  dealAddress: string,
  wallet: ethers.Wallet
): Deal => Deal__factory.connect(dealAddress, wallet);

export const getUSDContract = async (wallet: ethers.Wallet): Promise<ERC20> =>
  ERC20__factory.connect(await getDeveloperContract(wallet).usdToken(), wallet);

export const getFLTContract = async (wallet: ethers.Wallet): Promise<ERC20> =>
  ERC20__factory.connect(
    await getDeveloperContract(wallet).fluenceToken(),
    wallet
  );
