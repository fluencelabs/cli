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
  type GlobalConfig,
  type DealFactory,
  type DeveloperFaucet,
  type ERC20,
  type Core,
  type Matcher,
  Matcher__factory,
  Config__factory,
  type Config,
  type Workers,
  Workers__factory,
  type Controller,
  Controller__factory,
} from "@fluencelabs/deal-aurora";
import dealPkg from "@fluencelabs/deal-aurora";
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

const {
  Core__factory,
  DealFactory__factory,
  GlobalConfig__factory,
  DeveloperFaucet__factory,
  ERC20__factory,
} = dealPkg;

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
): Promise<ethers.Signer> => {
  return privKey === undefined
    ? getWalletConnectProvider(network)
    : getWallet(privKey, network);
};

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

const getWallet = (
  privKey: BytesLike,
  network: ChainNetwork
): ethers.Wallet => {
  return new ethers.Wallet(
    privKey,
    new providers.JsonRpcProvider(DEAL_CONFIG[network].ethereumNodeUrl)
  );
};

export class GlobalContracts {
  constructor(private signer: ethers.Signer, private network: ChainNetwork) {}

  getGlobalConfig(): GlobalConfig {
    return GlobalConfig__factory.connect(
      DEAL_CONFIG[this.network].globalConfig,
      this.signer
    );
  }

  getFactory(): DealFactory {
    return DealFactory__factory.connect(
      DEAL_CONFIG[this.network].dealFactoryAddress,
      this.signer
    );
  }

  getFaucet(): DeveloperFaucet {
    return DeveloperFaucet__factory.connect(
      DEAL_CONFIG[this.network].developerFaucetAddress,
      this.signer
    );
  }

  async getMatcher(): Promise<Matcher> {
    const config = this.getGlobalConfig();
    return Matcher__factory.connect(await config.matcher(), this.signer);
  }

  async getTUSD(): Promise<ERC20> {
    return ERC20__factory.connect(
      await this.getFaucet().usdToken(),
      this.signer
    );
  }

  async getFLT(): Promise<ERC20> {
    return ERC20__factory.connect(
      await this.getFaucet().fluenceToken(),
      this.signer
    );
  }
}

export class Deal {
  private core: Core;

  constructor(dealAddress: string, private signer: ethers.Signer) {
    this.core = Core__factory.connect(dealAddress, this.signer);
  }

  async getWorkers(): Promise<Workers> {
    const workersAddress = await this.core.getWorkers();
    return Workers__factory.connect(workersAddress, this.signer);
  }

  async getController(): Promise<Controller> {
    const controllerAddress = await this.core.getController();
    return Controller__factory.connect(controllerAddress, this.signer);
  }

  async getConfig(): Promise<Config> {
    const configAddress = await this.core.getConfig();
    return Config__factory.connect(configAddress, this.signer);
  }
}

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
