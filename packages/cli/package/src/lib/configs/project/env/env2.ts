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

import type { Deployment } from "@fluencelabs/deal-ts-clients";
import type { JSONSchemaType } from "ajv";
import isEmpty from "lodash-es/isEmpty.js";

import { CHAIN_ENV } from "../../../../common.js";
import { ENV_CONFIG_FULL_FILE_NAME, type FluenceEnv } from "../../../const.js";
import { fluenceEnvPrompt } from "../../../fluenceEnvPrompt.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import { type Config as PrevConfig } from "./env1.js";

type PerEnvConfig = {
  subgraphUrl?: string;
  rpcHttpUrl?: string;
  rpcWsUrl?: string;
  blockScoutUrl?: string;
  chainId?: number;
  deployment?: Partial<Deployment>;
  ipfsGateway?: string;
};

export type Config = {
  fluenceEnv?: FluenceEnv;
  perEnvConfig?: Partial<Record<FluenceEnv, PerEnvConfig>>;
};

const perEnvConfig = {
  type: "object",
  properties: {
    subgraphUrl: {
      type: "string",
      description: `Subgraph URL to use`,
      format: "uri",
      nullable: true,
    },
    rpcHttpUrl: {
      type: "string",
      description: `RPC HTTP URL to use`,
      format: "uri",
      nullable: true,
    },
    rpcWsUrl: {
      type: "string",
      description: `RPC WS URL to use`,
      format: "uri",
      nullable: true,
    },
    blockScoutUrl: {
      type: "string",
      description: `BlockScout URL to use`,
      format: "uri",
      nullable: true,
    },
    chainId: {
      type: "number",
      description: `Chain ID to use`,
      nullable: true,
    },
    deployment: {
      type: "object",
      description: `Deployed contract address overrides`,
      nullable: true,
      required: [],
      additionalProperties: false,
      properties: {
        usdc: { type: "string", nullable: true },
        multicall3: { type: "string", nullable: true },
        diamond: { type: "string", nullable: true },
        balanceKeeper: { type: "string", nullable: true },
      },
    },
    ipfsGateway: {
      type: "string",
      description: `IPFS gateway URL to use`,
      format: "uri",
      nullable: true,
    },
  },
  additionalProperties: false,
  nullable: true,
} as const satisfies JSONSchemaType<PerEnvConfig>;

export default {
  schema: {
    type: "object",
    properties: {
      fluenceEnv: {
        title: "Fluence environment",
        description: `Fluence environment to connect to`,
        type: "string",
        enum: [...CHAIN_ENV],
        nullable: true,
      },
      perEnvConfig: {
        type: "object",
        properties: {
          mainnet: perEnvConfig,
          testnet: perEnvConfig,
          stage: perEnvConfig,
          local: perEnvConfig,
        },
        required: [],
        additionalProperties: false,
        nullable: true,
      },
    },
    additionalProperties: false,
    required: [],
  },
  async migrate({ fluenceEnv, rpcUrl, ...rest }) {
    const perEnvConfig = {
      ...rest,
      ...(rpcUrl !== undefined ? { rpcHttpUrl: rpcUrl } : {}),
    };

    delete perEnvConfig.relays;

    if (fluenceEnv !== undefined) {
      return {
        fluenceEnv,
        ...(isEmpty(perEnvConfig)
          ? {}
          : { perEnvConfig: { [fluenceEnv]: perEnvConfig } }),
      };
    }

    if (isEmpty(perEnvConfig)) {
      return {};
    }

    const selectedFluenceEnv = await fluenceEnvPrompt(
      `You have existing config in ${ENV_CONFIG_FULL_FILE_NAME}. Select the environment you want to use it with`,
    );

    return {
      fluenceEnv: selectedFluenceEnv,
      perEnvConfig: { [selectedFluenceEnv]: perEnvConfig },
    };
  },
} as const satisfies ConfigOptions<PrevConfig, Config>;
