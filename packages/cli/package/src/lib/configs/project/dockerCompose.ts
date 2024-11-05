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
import { join, relative } from "path";

import { yamlDiffPatch } from "yaml-diff-patch";

import { versions } from "../../../versions.js";
import {
  CONFIGS_DIR_NAME,
  HTTP_PORT_START,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
} from "../../const.js";
import { numToStr } from "../../helpers/typesafeStringify.js";
import { pathExists } from "../../helpers/utils.js";
import { genSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { ensureFluenceConfigsDir, getFluenceDir } from "../../paths.js";
import { ensureDockerComposeConfigPath } from "../../paths.js";

import { CHAIN_RPC_CONTAINER_NAME } from "./chainContainers.js";
import { IPFS_CONTAINER_NAME } from "./chainContainers.js";
import { CHAIN_DEPLOY_SCRIPT_NAME } from "./chainContainers.js";
import {
  chainContainers,
  type Config,
  type Service,
} from "./chainContainers.js";
import {
  ensureComputerPeerConfigs,
  getConfigTomlName,
} from "./provider/provider.js";

type GenNoxImageArgs = {
  name: string;
  tcpPort: number;
  webSocketPort: number;
  httpPort: number;
  bootstrapName: string;
  bootstrapTcpPort?: number;
};

function genNox({
  name,
  tcpPort,
  webSocketPort,
  httpPort,
  bootstrapName,
  bootstrapTcpPort,
}: GenNoxImageArgs): [name: string, service: Service] {
  const configTomlName = getConfigTomlName(name);
  const configLocation = `/run/${CONFIGS_DIR_NAME}/${configTomlName}`;
  const tcpPortString = numToStr(tcpPort);
  const websocketPortString = numToStr(webSocketPort);
  return [
    name,
    {
      image: versions.nox,
      ports: [
        `${tcpPortString}:${tcpPortString}`,
        `${websocketPortString}:${websocketPortString}`,
      ],
      environment: {
        WASM_LOG: "debug",
        FLUENCE_MAX_SPELL_PARTICLE_TTL: "30s",
        FLUENCE_ROOT_KEY_PAIR__PATH: `/run/secrets/${name}`,
        RUST_LOG:
          "info,chain_connector=debug,run-console=trace,aquamarine::log=debug,network=trace,worker_inactive=trace,expired=info,spell=debug,ipfs_effector=debug,ipfs_pure=debug,spell_event_bus=trace,system_services=debug,particle_reap=debug,aquamarine::actor=debug,aquamarine::aqua_runtime=off,aquamarine=warn,chain_listener=debug,chain-connector=debug,execution=trace",
      },
      command: [
        `--config=${configLocation}`,
        "--dev-mode",
        "--external-maddrs",
        `/dns4/${name}/tcp/${tcpPortString}`,
        `/dns4/${name}/tcp/${websocketPortString}/ws`,
        "--allow-private-ips",
        bootstrapTcpPort === undefined
          ? "--local"
          : `--bootstraps=/dns/${bootstrapName}/tcp/${numToStr(bootstrapTcpPort)}`,
        "--print-config",
      ],
      depends_on: {
        [IPFS_CONTAINER_NAME]: { condition: "service_healthy" },
        [CHAIN_RPC_CONTAINER_NAME]: { condition: "service_healthy" },
        [CHAIN_DEPLOY_SCRIPT_NAME]: {
          condition: "service_completed_successfully",
        },
      },
      volumes: [
        `./${CONFIGS_DIR_NAME}/${configTomlName}:${configLocation}`,
        `${name}:/.fluence`,
      ],
      secrets: [name],
      healthcheck: {
        test: `curl -f http://localhost:${numToStr(httpPort)}/health`,
        interval: "5s",
        timeout: "2s",
        retries: 10,
      },
    },
  ];
}

async function genDefaultDockerCompose(): Promise<Config> {
  const configsDir = await ensureFluenceConfigsDir();
  const fluenceDir = getFluenceDir();
  const computePeers = await ensureComputerPeerConfigs();

  const peers = await Promise.all(
    computePeers.map(async ({ name, overriddenNoxConfig }) => {
      return {
        ...(await genSecretKeyOrReturnExisting(name)),
        webSocketPort: overriddenNoxConfig.websocketPort,
        tcpPort: overriddenNoxConfig.tcpPort,
        httpPort: overriddenNoxConfig.httpPort,
        relativeConfigFilePath: relative(
          fluenceDir,
          join(configsDir, getConfigTomlName(name)),
        ),
      };
    }),
  );

  const [bootstrap, ...restNoxes] = peers;

  assert(
    bootstrap !== undefined,
    `Unreachable. 'computePeers' non-emptiness is checked during ${PROVIDER_CONFIG_FULL_FILE_NAME} validation`,
  );

  const {
    name: bootstrapName,
    webSocketPort: bootstrapWebSocketPort = WEB_SOCKET_PORT_START,
    tcpPort: bootstrapTcpPort = TCP_PORT_START,
    httpPort: bootstrapHttpPort = HTTP_PORT_START,
  } = bootstrap;

  return {
    volumes: {
      ...chainContainers.volumes,
      ...Object.fromEntries(
        peers.map(({ name }) => {
          return [name, null] as const;
        }),
      ),
    },
    secrets: Object.fromEntries(
      peers.map(({ name, relativeSecretFilePath: file }) => {
        return [name, { file }] as const;
      }),
    ),
    services: {
      ...chainContainers.services,
      ...Object.fromEntries([
        genNox({
          name: bootstrapName,
          tcpPort: bootstrapTcpPort,
          webSocketPort: bootstrapWebSocketPort,
          httpPort: bootstrapHttpPort,
          bootstrapName: bootstrapName,
        }),
      ]),
      ...Object.fromEntries(
        restNoxes.map(({ name, tcpPort, webSocketPort, httpPort }) => {
          return genNox({
            name,
            tcpPort,
            webSocketPort,
            httpPort,
            bootstrapName,
            bootstrapTcpPort,
          });
        }),
      ),
    },
  };
}

export async function ensureDockerComposeConfig() {
  const configPath = await ensureDockerComposeConfigPath();

  if (!(await pathExists(configPath))) {
    await writeFile(
      configPath,
      yamlDiffPatch("", {}, await genDefaultDockerCompose()),
    );
  }

  return configPath;
}

export async function checkDockerComposeConfigExists() {
  const configPath = await ensureDockerComposeConfigPath();
  return (await pathExists(configPath)) ? configPath : null;
}
