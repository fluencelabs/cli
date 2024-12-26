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

import assert from "assert";
import { writeFile } from "fs/promises";
import { join } from "path";

import times from "lodash-es/times.js";

import {
  getChainId,
  getIpfsGateway,
  getRpcUrl,
} from "../../../chain/chainConfig.js";
import { hexStringToUTF8ToBase64String } from "../../../chain/conversions.js";
import { peerIdBase58ToHexString } from "../../../chain/conversions.js";
import { commandObj, isInteractive } from "../../../commandObj.js";
import {
  DEFAULT_OFFER_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_STAKER_REWARD,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_PEER,
  CLI_NAME,
  DEFAULT_NUMBER_OF_LOCAL_NET_PEERS,
  WS_CHAIN_URLS,
} from "../../../const.js";
import { resolveDeployment } from "../../../dealClient.js";
import { ensureChainEnv } from "../../../ensureChainNetwork.js";
import { type ProviderConfigArgs } from "../../../generateUserProviderConfig.js";
import { genManifest } from "../../../genManifest.js";
import { getPeerIdFromSecretKey } from "../../../helpers/getPeerIdFromSecretKey.js";
import { numToStr } from "../../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../../helpers/utils.js";
import { genSecretKeyOrReturnExisting } from "../../../keyPairs.js";
import {
  getProviderConfigPath,
  getFluenceDir,
  ensureFluenceSecretsFilePath,
  ensureK8sManifestsDir,
} from "../../../paths.js";
import { input } from "../../../prompt.js";
import { getConfigInitFunction } from "../../initConfigNew.js";
import { type InitConfigOptions } from "../../initConfigNewTypes.js";
import { initNewEnvConfig } from "../env/env.js";
import { initNewProviderSecretsConfig } from "../providerSecrets/providerSecrets.js";

import configOptions0, { type Config as Config0 } from "./provider0.js";
import configOptions1, { type Config as Config1 } from "./provider1.js";
import configOptions2, { type Config as Config2 } from "./provider2.js";
import configOptions3, { type Config as Config3 } from "./provider3.js";
import configOptions4, {
  type Config as Config4,
  type ComputePeer,
  defaultComputePeerConfig,
  getDefaultResources,
  getDefaultOfferResources,
  type ResourceType,
  mergeCPUResources,
  mergeRAMResources,
  mergeStorageResources,
  mergeIPResources,
  mergeBandwidthResources,
} from "./provider4.js";

export const options: InitConfigOptions<
  Config0,
  Config1,
  Config2,
  Config3,
  Config4
> = {
  description: "Defines provider configuration",
  options: [
    configOptions0,
    configOptions1,
    configOptions2,
    configOptions3,
    configOptions4,
  ],
  getConfigPath: getProviderConfigPath,
  getSchemaDirPath: getFluenceDir,
};

export type ProviderConfig = Awaited<ReturnType<typeof initNewProviderConfig>>;

function getDefault(args: ProviderConfigArgs) {
  return async () => {
    const chainEnv = await ensureChainEnv();
    await initNewEnvConfig(chainEnv);
    const isLocal = chainEnv === "local";

    const numberOfPeers =
      args.peers ??
      (isInteractive && !isLocal
        ? Number(
            await input({
              message: `Enter number of compute peers you want to set up`,
              validate(value) {
                return Number.isInteger(Number(value)) && Number(value) > 0
                  ? true
                  : "Must be a positive integer";
              },
            }),
          )
        : DEFAULT_NUMBER_OF_LOCAL_NET_PEERS);

    const computePeerEntries: [string, ComputePeer][] = [];

    for (const i of times(numberOfPeers)) {
      const name = `peer-${numToStr(i)}`;

      computePeerEntries.push([
        name,
        defaultComputePeerConfig({
          computeUnits: DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_PEER,
          name,
        }),
      ] as const);
    }

    const computePeers = Object.fromEntries(computePeerEntries);

    return {
      providerName: "defaultProvider",
      resources: getDefaultResources(),
      computePeers,
      offers: {
        [DEFAULT_OFFER_NAME]: {
          computePeers: Object.keys(computePeers),
          resourcePrices: getDefaultOfferResources(),
        },
      },
      capacityCommitments: Object.fromEntries(
        Object.keys(computePeers).map((peerName) => {
          return [
            peerName,
            {
              duration: DEFAULT_CC_DURATION,
              stakerReward: DEFAULT_CC_STAKER_REWARD,
            },
          ] as const;
        }),
      ),
    };
  };
}

export function initNewProviderConfig(args: ProviderConfigArgs = {}) {
  return getConfigInitFunction(options, getDefault(args))();
}

export const initProviderConfig = getConfigInitFunction(options);

export async function ensureReadonlyProviderConfig() {
  const providerConfig = await initProviderConfig();

  if (providerConfig === null) {
    commandObj.error(
      `Please init ${PROVIDER_CONFIG_FULL_FILE_NAME} using '${CLI_NAME} provider init' in order to continue`,
    );
  }

  return providerConfig;
}

export type EnsureComputerPeerConfig = Awaited<
  ReturnType<typeof ensureComputerPeerConfigs>
>[number];

export async function ensureComputerPeerConfigs(computePeerNames?: string[]) {
  const { Wallet } = await import("ethers");
  const providerConfig = await ensureReadonlyProviderConfig();

  const providerSecretsConfig =
    await initNewProviderSecretsConfig(providerConfig);

  const [computePeersWithoutKeys, computePeersWithKeys] = splitErrorsAndResults(
    Object.entries(providerConfig.computePeers)
      .filter(([name]) => {
        return (
          computePeerNames === undefined || computePeerNames.includes(name)
        );
      })
      .map(([computePeerName, computePeer]) => {
        return {
          computePeerName,
          computePeer,
          secretKey: providerSecretsConfig.noxes[computePeerName]?.networkKey,
          signingWallet:
            providerSecretsConfig.noxes[computePeerName]?.signingWallet,
        };
      }),
    ({ secretKey, signingWallet, computePeerName, computePeer }) => {
      return secretKey === undefined || signingWallet === undefined
        ? { error: { computePeerName, computePeer } }
        : {
            result: { secretKey, signingWallet, computePeerName, computePeer },
          };
    },
  );

  if (computePeersWithoutKeys.length > 0) {
    commandObj.warn(
      `Missing keys for the following compute peers in noxes property at ${providerSecretsConfig.$getPath()}:\n${computePeersWithoutKeys
        .map(({ computePeerName }) => {
          return computePeerName;
        })
        .join(", ")}\nGenerating new ones...`,
    );

    const computePeersWithGeneratedKeys = await Promise.all(
      computePeersWithoutKeys.map(async ({ computePeer, computePeerName }) => {
        return {
          secretKey: (await genSecretKeyOrReturnExisting(computePeerName))
            .secretKey,
          computePeerName,
          computePeer,
          signingWallet: Wallet.createRandom().privateKey,
        };
      }),
    );

    providerSecretsConfig.noxes = {
      ...providerSecretsConfig.noxes,
      ...Object.fromEntries(
        computePeersWithGeneratedKeys.map(
          ({ computePeerName, secretKey, signingWallet }) => {
            return [
              computePeerName,
              { networkKey: secretKey, signingWallet },
            ] as const;
          },
        ),
      ),
    };

    await providerSecretsConfig.$commit();
    computePeersWithKeys.push(...computePeersWithGeneratedKeys);
  }

  const [noCCError, computePeersWithCC] = splitErrorsAndResults(
    computePeersWithKeys,
    (c) => {
      const capacityCommitment =
        providerConfig.capacityCommitments[c.computePeerName];

      if (capacityCommitment === undefined) {
        return {
          error: c.computePeerName,
        };
      }

      return { result: { ...c, capacityCommitment } };
    },
  );

  if (noCCError.length > 0) {
    commandObj.error(
      `Missing capacity commitment for compute peers at ${providerConfig.$getPath()}:\n\n${noCCError
        .map((n) => {
          return `capacityCommitments.${n}`;
        })
        .join("\n")}`,
    );
  }

  const env = await ensureChainEnv();
  const k8sManifestsDir = await ensureK8sManifestsDir();
  const { diamond: diamondContract } = await resolveDeployment();
  const networkId = numToStr(await getChainId());
  const ipfsGatewayEndpoint = await getIpfsGateway();
  const wsEndpoint = WS_CHAIN_URLS[env];
  const httpEndpoint = await getRpcUrl();

  return Promise.all(
    computePeersWithCC.map(
      async ({
        computePeerName,
        computePeer,
        secretKey,
        signingWallet,
        capacityCommitment,
      }) => {
        await writeFile(
          await ensureFluenceSecretsFilePath(computePeerName),
          secretKey,
          "utf8",
        );

        const peerId = await getPeerIdFromSecretKey(secretKey);

        const manifest = genManifest({
          chainPrivateKey: hexStringToUTF8ToBase64String(signingWallet),
          ipSupplies: computePeer.resources.ip.supply,
          httpEndpoint,
          wsEndpoint,
          ipfsGatewayEndpoint,
          peerIdHex: await peerIdBase58ToHexString(peerId),
          networkId,
          diamondContract,
        });

        const manifestPath = join(k8sManifestsDir, `${computePeerName}.yaml`);
        await writeFile(manifestPath, manifest, "utf8");

        const cpu =
          providerConfig.resources.cpu[computePeer.resources.cpu.name];

        assert(
          cpu !== undefined,
          `Unreachable. cpu must be defined for ${computePeerName} because it is validated in the config`,
        );

        const ram =
          providerConfig.resources.ram[computePeer.resources.ram.name];

        assert(
          ram !== undefined,
          `Unreachable. ram must be defined for ${computePeerName} because it is validated in the config`,
        );

        const storages = computePeer.resources.storage.map((s) => {
          const storage = providerConfig.resources.storage[s.name];

          assert(
            storage !== undefined,
            `Unreachable. storage must be defined for ${computePeerName} because it is validated in the config`,
          );

          return mergeStorageResources(storage, s);
        });

        const ip = providerConfig.resources.ip[computePeer.resources.ip.name];

        assert(
          ip !== undefined,
          `Unreachable. ip must be defined for ${computePeerName} because it is validated in the config`,
        );

        const bandwidth =
          providerConfig.resources.bandwidth[
            computePeer.resources.bandwidth.name
          ];

        assert(
          bandwidth !== undefined,
          `Unreachable. bandwidth must be defined for ${computePeerName} because it is validated in the config`,
        );

        const resourcesWithIds = {
          cpu: mergeCPUResources(cpu, computePeer.resources.cpu),
          ram: mergeRAMResources(ram, computePeer.resources.ram),
          storage: storages,
          ip: mergeIPResources(ip, computePeer.resources.ip),
          bandwidth: mergeBandwidthResources(
            bandwidth,
            computePeer.resources.bandwidth,
          ),
        } as const satisfies Record<
          ResourceType,
          { id: string } | Array<{ id: string }>
        >;

        return {
          name: computePeerName,
          secretKey,
          peerId,
          kubeconfigPath: computePeer.kubeconfigPath,
          resourcesWithIds,
          manifestPath,
          walletKey: signingWallet,
          walletAddress: await new Wallet(signingWallet).getAddress(),
          capacityCommitment,
        };
      },
    ),
  );
}
