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

import {
  hexStringToUTF8ToBase64String,
  utf8ToBase64String,
} from "./chain/conversions.js";
import type { IPSupplies } from "./configs/project/provider/provider1.js";

const PRIVATE_KEY_SECRET_REF = "private-key-secret";
const PRIVATE_RPC_TOKEN_SECRET_REF = "private-rpc-token-secret";

type GenManifestsArgs = {
  signingWallet: string;
  ipSupplies: IPSupplies;
  httpEndpoint: string;
  wsEndpoint: string;
  ipfsGatewayEndpoint: string;
  peerId: string;
  networkId: string;
  diamondContract: string;
};

export async function genManifest({
  signingWallet,
  ipSupplies,
  httpEndpoint,
  wsEndpoint,
  ipfsGatewayEndpoint,
  peerId,
  networkId,
  diamondContract,
}: GenManifestsArgs) {
  const { stringify } = await import("yaml");
  return `---
# if VM is enabled
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubevirt
  namespace: flux-system
spec:
  interval: 1m
  path: "./flux/components/kubevirt/app"
  prune: true
  sourceRef:
    kind: GitRepository
    name: spectrum
    namespace: flux-system

---
# l2 magic
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-l2
  namespace: flux-system
${stringify({
  spec: {
    interval: "1m",
    path: "./flux/components/cilium-l2",
    prune: true,
    sourceRef: {
      kind: "GitRepository",
      name: "spectrum",
      namespace: "flux-system",
    },
    patches: [
      {
        patch: stringify([
          {
            op: "add",
            path: "/spec/blocks",
            value: ipSupplies,
          },
        ]),
        target: {
          kind: "CiliumLoadBalancerIPPool",
          name: "fluence-l2",
          namespace: "kube-system",
        },
      },
    ],
  },
})}
---
apiVersion: v1
kind: Namespace
metadata:
  name: lightmare
---
# lightmare config
apiVersion: v1
kind: ConfigMap
metadata:
  name: chain-adapter-config
  namespace: lightmare
${stringify({
  data: {
    "values.yaml": stringify({
      operator: {
        config: {
          chainAdapter: {
            ipfsGatewayEndpoint,
            peerId,
            networkId,
            diamondContract,
            privateKeySecretRef: PRIVATE_KEY_SECRET_REF,
            privateRPCTokenSecretRef: PRIVATE_RPC_TOKEN_SECRET_REF,
          },
        },
      },
    }),
  },
})}
---
# chain private key
apiVersion: v1
kind: Secret
metadata:
  name: ${PRIVATE_KEY_SECRET_REF}
  namespace: lightmare
type: Opaque
${stringify({
  data: {
    "chain-private-key": hexStringToUTF8ToBase64String(signingWallet),
  },
})}
---
# chain rpc token
apiVersion: v1
kind: Secret
metadata:
  name: ${PRIVATE_RPC_TOKEN_SECRET_REF}
  namespace: lightmare
type: Opaque
${stringify({
  data: {
    CHAIN_HTTP_ENDPOINT: utf8ToBase64String(httpEndpoint),
    CHAIN_WS_ENDPOINT: utf8ToBase64String(wsEndpoint),
  },
})}
---
# lightmare deployment
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: lightmare
  namespace: flux-system
spec:
  interval: 1m
  path: "./flux/core/lightmare/app"
  prune: true
  sourceRef:
    kind: GitRepository
    name: spectrum
    namespace: flux-system
`;
}
