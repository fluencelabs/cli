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

import { writeFile } from "fs/promises";
import { join } from "path";

import { type JsonMap } from "@iarna/toml";
import kebabCase from "lodash-es/kebabCase.js";
import mapKeys from "lodash-es/mapKeys.js";
import snakeCase from "lodash-es/snakeCase.js";
import times from "lodash-es/times.js";

import { type ChainENV } from "../../../../common.js";
import { ajv } from "../../../ajvInstance.js";
import { commandObj, isInteractive } from "../../../commandObj.js";
import {
  DEFAULT_OFFER_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  FS_OPTIONS,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  TOML_EXT,
  defaultNumberProperties,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_STAKER_REWARD,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
  DEFAULT_CURL_EFFECTOR_CID,
  CLI_NAME,
  DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
  DEFAULT_VM_EFFECTOR_CID,
} from "../../../const.js";
import { ensureChainEnv } from "../../../ensureChainNetwork.js";
import { type ProviderConfigArgs } from "../../../generateUserProviderConfig.js";
import { getPeerIdFromSecretKey } from "../../../helpers/getPeerIdFromSecretKey.js";
import { numToStr } from "../../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../../helpers/utils.js";
import { genSecretKeyOrReturnExisting } from "../../../keyPairs.js";
import {
  ensureFluenceConfigsDir,
  getProviderConfigPath,
  getFluenceDir,
  ensureFluenceSecretsFilePath,
  ensureFluenceCCPConfigsDir,
} from "../../../paths.js";
import { input } from "../../../prompt.js";
import { getConfigInitFunction } from "../../initConfigNew.js";
import { type InitConfigOptions } from "../../initConfigNewTypes.js";
import { initNewEnvConfig } from "../env/env.js";
import { initNewProviderSecretsConfig } from "../providerSecrets/providerSecrets.js";

import configOptions0, { type Config as Config0 } from "./provider0.js";
import configOptions1, {
  DEFAULT_LOG_LEVEL,
  DEFAULT_PROMETHEUS_ENDPOINT_HOST,
  DEFAULT_PROMETHEUS_ENDPOINT_PORT,
  DEFAULT_REPORT_HASHRATE,
  DEFAULT_RPC_ENDPOINT_HOST,
  DEFAULT_RPC_ENDPOINT_PORT,
  type CCPConfigYAML,
  type ComputePeer,
  type Config as Config1,
  type NoxConfigYAML,
} from "./provider1.js";
import configOptions2, { type Config as Config2 } from "./provider2.js";
import configOptions3, {
  mergeConfigYAMLWithRawConfig,
  resolveNoxConfigYAML,
  type Config as Config3,
} from "./provider3.js";

export const options: InitConfigOptions<Config0, Config1, Config2, Config3> = {
  description: "Defines config used for provider set up",
  options: [configOptions0, configOptions1, configOptions2, configOptions3],
  getConfigPath: getProviderConfigPath,
  getSchemaDirPath: getFluenceDir,
};

export type ProviderConfig = Awaited<ReturnType<typeof initNewProviderConfig>>;

const ipValidator = ajv.compile({
  type: "string",
  format: "ipv4",
});

function validateIp(value: string) {
  return ipValidator(value) ? true : "Must be a valid IPv4 address";
}

function getDefault(args: ProviderConfigArgs) {
  return async () => {
    const chainEnv = await ensureChainEnv();
    await initNewEnvConfig(chainEnv);
    const isLocal = chainEnv === "local";
    const hasVM = !isLocal && args["no-vm"] !== true;

    const numberOfNoxes =
      args.noxes ??
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
        : DEFAULT_NUMBER_OF_LOCAL_NET_NOXES);

    const computePeerEntries: [string, ComputePeer][] = [];

    for (const i of times(numberOfNoxes)) {
      const peerConfig = hasVM
        ? {
            nox: {
              vm: {
                network: {
                  publicIp: isInteractive
                    ? await input({
                        message: `Enter public IP address for nox-${numToStr(i)}`,
                        validate: validateIp,
                      })
                    : "",
                },
              },
            },
          }
        : {};

      computePeerEntries.push([
        `nox-${numToStr(i)}`,
        {
          computeUnits: DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
          ...peerConfig,
        },
      ] as const);
    }

    const computePeers = Object.fromEntries(computePeerEntries);

    return {
      providerName: "defaultProvider",
      nox: {
        effectors: {
          curl: {
            wasmCID: DEFAULT_CURL_EFFECTOR_CID,
            allowedBinaries: { curl: "/usr/bin/curl" },
          },
          ...(hasVM ? { vm: { wasmCID: DEFAULT_VM_EFFECTOR_CID } } : {}),
        },
      },
      computePeers,
      offers: {
        [DEFAULT_OFFER_NAME]: {
          ...defaultNumberProperties,
          computePeers: Object.keys(computePeers),
          effectors: [
            DEFAULT_CURL_EFFECTOR_CID,
            ...(hasVM ? [DEFAULT_VM_EFFECTOR_CID] : []),
          ],
        },
      },
      capacityCommitments: Object.fromEntries(
        Object.keys(computePeers).map((noxName) => {
          return [
            noxName,
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

function resolveCCPConfigYAML(
  globalCCPConfig: CCPConfigYAML | undefined = {},
  computePeerCCPConfig: CCPConfigYAML | undefined = {},
) {
  const config = mergeConfigYAMLWithRawConfig(
    getDefaultCCPConfigYAML(),
    globalCCPConfig,
  );

  return mergeConfigYAMLWithRawConfig(config, computePeerCCPConfig);
}

function getObjByKey(obj: Record<string, unknown>, key: string): object {
  if (!(key in obj)) {
    return {};
  }

  const value = obj[key];
  return typeof value === "object" && value !== null ? value : {};
}

function noxConfigYAMLToConfigToml(
  {
    chain: { diamondContract, walletPrivateKey, ...chain } = {},
    ccp,
    listenIp,
    metrics,
    effectors,
    ...config
  }: NoxConfigYAML,
  ccpConfig: CCPConfigYAML,
  env: ChainENV,
) {
  const chainConfig = {
    httpEndpoint: chain.httpEndpoint,
    diamondContractAddress: diamondContract,
    networkId: chain.networkId,
    walletKey: walletPrivateKey,
    defaultBaseFee: chain.defaultBaseFee,
    defaultPriorityFee: chain.defaultPriorityFee,
    ...getObjByKey(config, "chain_config"),
  };

  // Would be too hard to properly type this
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return camelCaseKeysToSnakeCase({
    ...config,
    ...(listenIp === undefined
      ? {}
      : {
          listenConfig: {
            listenIp,
            ...getObjByKey(config, "listen_config"),
          },
        }),
    chainConfig,
    ...(env === "local"
      ? {}
      : {
          chainListenerConfig: {
            wsEndpoint: chain.wsEndpoint,
            ccpEndpoint:
              ccp?.ccpEndpoint ??
              `http://${
                ccpConfig.rpcEndpoint?.host ?? DEFAULT_RPC_ENDPOINT_HOST
              }:${numToStr(
                ccpConfig.rpcEndpoint?.port ?? DEFAULT_RPC_ENDPOINT_PORT,
              )}`,
            proofPollPeriod: ccp?.proofPollPeriod,
            ...getObjByKey(config, "chain_listener_config"),
          },
        }),
    tokioMetricsEnabled: metrics?.tokioMetricsEnabled,
    tokioDetailedMetricsEnabled: metrics?.tokioDetailedMetricsEnabled,
    metricsEnabled: metrics?.enabled,
    metricsTimerResolution: metrics?.timerResolution,
    ...(effectors === undefined
      ? {}
      : {
          effectors: Object.fromEntries(
            Object.entries(effectors).map(
              ([name, { wasmCID, allowedBinaries }]) => {
                return [
                  name,
                  { wasmCID, allowedBinaries: allowedBinaries ?? {} },
                ] as const;
              },
            ),
          ),
        }),
  }) as JsonMap;
}

function ccpConfigYAMLToConfigToml(config: CCPConfigYAML) {
  // Would be too hard to properly type this
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return camelCaseKeysToKebabCase(config) as JsonMap;
}

function camelCaseToDifferentCase(caseFn: (str: string) => string) {
  const camelCaseToDifferentCaseImpl = (val: unknown): unknown => {
    if (typeof val === "object" && val !== null) {
      if (Array.isArray(val)) {
        return val.map(camelCaseToDifferentCaseImpl);
      }

      const objWithSnakeCaseKeys = mapKeys(val, (_, key) => {
        return caseFn(key);
      });

      return Object.fromEntries(
        Object.entries(objWithSnakeCaseKeys).map(([key, value]) => {
          return [key, camelCaseToDifferentCaseImpl(value)];
        }),
      );
    }

    return val;
  };

  return camelCaseToDifferentCaseImpl;
}

function camelCaseKeysToSnakeCase(val: unknown): unknown {
  return camelCaseToDifferentCase(snakeCase)(val);
}

function camelCaseKeysToKebabCase(val: unknown): unknown {
  return camelCaseToDifferentCase(kebabCase)(val);
}

function getDefaultCCPConfigYAML(): CCPConfigYAML {
  return {
    rpcEndpoint: {
      host: DEFAULT_RPC_ENDPOINT_HOST,
      port: DEFAULT_RPC_ENDPOINT_PORT,
      utilityThreadIds: [1],
    },
    prometheusEndpoint: {
      host: DEFAULT_PROMETHEUS_ENDPOINT_HOST,
      port: DEFAULT_PROMETHEUS_ENDPOINT_PORT,
    },
    logs: {
      reportHashrate: DEFAULT_REPORT_HASHRATE,
      logLevel: DEFAULT_LOG_LEVEL,
    },
  };
}

export function getConfigTomlName(noxName: string) {
  return `${noxName}_Config.${TOML_EXT}`;
}

function getCCPConfigTomlName(noxName: string) {
  return `${noxName}_Config.${TOML_EXT}`;
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

  const { stringify } = await import("@iarna/toml");
  const configsDir = await ensureFluenceConfigsDir();
  const ccpConfigsDir = await ensureFluenceCCPConfigsDir();
  const env = await ensureChainEnv();

  if (env === "local") {
    const cpWithoutGeneratedPorts = computePeersWithCC.slice(
      WEB_SOCKET_PORT_START - TCP_PORT_START,
    );

    if (
      cpWithoutGeneratedPorts.length > 0 &&
      !cpWithoutGeneratedPorts.every(({ computePeer: { nox } }) => {
        return (
          nox?.httpPort !== undefined &&
          nox.tcpPort !== undefined &&
          nox.websocketPort !== undefined
        );
      })
    ) {
      commandObj.error(
        `Please define httpPort, tcpPort and websocketPort for compute peers ${cpWithoutGeneratedPorts
          .map(({ computePeerName }) => {
            return computePeerName;
          })
          .join(", ")} in ${providerConfig.$getPath()}`,
      );
    }
  }

  return Promise.all(
    computePeersWithCC.map(
      async (
        {
          computePeerName,
          computePeer,
          secretKey,
          signingWallet,
          capacityCommitment,
        },
        i,
      ) => {
        await writeFile(
          await ensureFluenceSecretsFilePath(computePeerName),
          secretKey,
          FS_OPTIONS,
        );

        const overridenCCPConfig = resolveCCPConfigYAML(
          providerConfig.ccp,
          computePeer.ccp,
        );

        await writeFile(
          join(ccpConfigsDir, getCCPConfigTomlName(computePeerName)),
          stringify(ccpConfigYAMLToConfigToml(overridenCCPConfig)),
          FS_OPTIONS,
        );

        const overriddenNoxConfig = await resolveNoxConfigYAML(
          providerConfig.nox,
          computePeer.nox,
          { i, signingWallet },
        );

        await writeFile(
          join(configsDir, getConfigTomlName(computePeerName)),
          stringify(
            noxConfigYAMLToConfigToml(
              overriddenNoxConfig,
              overridenCCPConfig,
              env,
            ),
          ),
          FS_OPTIONS,
        );

        return {
          name: computePeerName,
          overriddenNoxConfig,
          secretKey,
          peerId: await getPeerIdFromSecretKey(secretKey),
          computeUnits: computePeer.computeUnits,
          walletKey: signingWallet,
          walletAddress: await new Wallet(signingWallet).getAddress(),
          capacityCommitment,
        };
      },
    ),
  );
}
