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

import { readFile } from "fs/promises";
import { isAbsolute, resolve } from "path/posix";

import type k8s from "@kubernetes/client-node";
import { stringify } from "yaml";

import { commandObj } from "./commandObj.js";
import type { IPSupplies } from "./configs/project/provider/provider1.js";
import { projectRootDir } from "./paths.js";
import { resolveComputePeersByNames } from "./resolveComputePeersByNames.js";

const PRIVATE_KEY_SECRET_REF = "private-key-secret";

type GenManifestsArgs = {
  chainPrivateKey: string;
  ipSupplies: IPSupplies;
  httpEndpoint: string;
  wsEndpoint: string;
  ipfsGatewayEndpoint: string;
  peerId: string;
  networkId: string;
  diamondContract: string;
};

export function genManifest({
  chainPrivateKey,
  ipSupplies,
  httpEndpoint,
  wsEndpoint,
  ipfsGatewayEndpoint,
  peerId,
  networkId,
  diamondContract,
}: GenManifestsArgs) {
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
            httpEndpoint,
            wsEndpoint,
            ipfsGatewayEndpoint,
            peerId,
            networkId,
            diamondContract,
            privateKeySecretRef: PRIVATE_KEY_SECRET_REF,
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
    "chain-private-key": chainPrivateKey,
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

export async function deployManifests({
  flags,
  writeManifestFiles = false,
}: Parameters<typeof resolveComputePeersByNames>[0]) {
  const computePeers = await resolveComputePeersByNames({
    flags,
    writeManifestFiles,
  });

  for (const { kubeconfigPath, name, manifestPath } of computePeers) {
    await kubectlApply(kubeconfigPath, manifestPath, name);
  }
}

/**
 * This function comes from https://github.com/kubernetes-client/javascript
 * Replicate the functionality of `kubectl apply`.  That is, create the resources defined in the `specFile` if they do
 * not exist, patch them if they do exist.
 *
 * @param specPath File system path to a YAML Kubernetes spec.
 * @return Array of resources created
 */
async function kubectlApply(
  kubeconfigPath: string,
  specPath: string,
  peerName: string,
): Promise<k8s.KubernetesObject[]> {
  const kubeconfigAbsolutePath = isAbsolute(kubeconfigPath)
    ? kubeconfigPath
    : resolve(projectRootDir, kubeconfigPath);

  commandObj.log(
    `Applying manifest for computePeer ${peerName}\nKubeconfig: ${kubeconfigAbsolutePath}\nManifest: ${specPath}`,
  );

  const k8s = await import("@kubernetes/client-node");
  const kc = new k8s.KubeConfig(kubeconfigAbsolutePath);
  kc.loadFromFile(kubeconfigAbsolutePath);

  /* eslint-disable */
  const client = k8s.KubernetesObjectApi.makeApiClient(kc);

  const specString = await readFile(specPath, "utf8");
  const specs: k8s.KubernetesObject[] = k8s.loadAllYaml(specString);

  const validSpecs = specs.filter((s) => {
    return s && s.kind && s.metadata;
  });

  const created: k8s.KubernetesObject[] = [];

  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};

    delete spec.metadata.annotations[
      "kubectl.kubernetes.io/last-applied-configuration"
    ];

    spec.metadata.annotations[
      "kubectl.kubernetes.io/last-applied-configuration"
    ] = JSON.stringify(spec);

    try {
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      // @ts-expect-error
      await client.read(spec);
      // we got the resource, so it exists, so patch it
      //
      // Note that this could fail if the spec refers to a custom resource. For custom resources you may need
      // to specify a different patch merge strategy in the content-type header.
      //
      // See: https://github.com/kubernetes/kubernetes/issues/97423
      const response = await client.patch(spec);
      created.push(response.body);
    } catch (err) {
      // if the resource doesnt exist then create it
      if (err instanceof k8s.HttpError && err.statusCode === 404) {
        const response = await client.create(spec);
        created.push(response.body);
      } else {
        throw err;
      }
    }
  }

  return created;
  /* eslint-enable */
}
