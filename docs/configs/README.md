# README

## Top-level Schemas

*   [app.yaml](./app.md "Describes what exactly is already deployed") – `https://fluence.dev/schemas/app.yaml`

*   [fluence.yaml](./fluence.md "Describes what exactly you want to deploy and how") – `https://fluence.dev/schemas/fluence.yaml`

*   [module.yaml](./module.md "Module is a directory which contains this config and either a precompiled ") – `https://fluence.dev/schemas/module.yaml`

*   [project-secrets.yaml](./project-secrets.md "Located in the project's ") – `https://fluence.dev/schemas/project-secrets.yaml`

*   [service.yaml](./service.md "Service is a directory which contains this config") – `https://fluence.dev/schemas/service.yaml`

*   [user-secrets.yaml](./user-secrets.md) – `https://fluence.dev/schemas/user-secrets.yaml`

## Other Schemas

### Objects

*   [Cargo dependencies](./fluence-properties-dependencies-properties-cargo-dependencies.md "A map of the exact cargo dependency versions") – `https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/cargo`

*   [Dependencies](./fluence-properties-dependencies.md "A map of the exact dependency versions") – `https://fluence.dev/schemas/fluence.yaml#/properties/dependencies`

*   [Deployed service info](./app-properties-services-deployment-ids-a-list-of-deployed-services-deployed-service-info.md) – `https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties/additionalProperties/items`

*   [Deployment](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment.md "A small config for a particular deployment") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items`

*   [Deployment id map](./fluence-properties-services-deployment-id-map.md) – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties`

*   [Deployment ids](./app-properties-services-deployment-ids.md "A map of the deployment ids of the deployed services") – `https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties`

*   [Environment variables](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-overrides-module-overrides-properties-environment-variables.md "environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/overrideModules/additionalProperties/properties/envs`

*   [Environment variables](./module-properties-environment-variables.md "environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)") – `https://fluence.dev/schemas/module.yaml#/properties/envs`

*   [Environment variables](./service-properties-modules-module-properties-environment-variables.md "environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)") – `https://fluence.dev/schemas/service.yaml#/properties/modules/additionalProperties/properties/envs`

*   [Environment variables](./service-properties-modules-properties-module-properties-environment-variables.md "environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)") – `https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/envs`

*   [Key Pair](./project-secrets-properties-key-pairs-key-pair.md) – `https://fluence.dev/schemas/project-secrets.yaml#/properties/keyPairs/items`

*   [Key Pair](./user-secrets-properties-key-pairs-key-pair.md) – `https://fluence.dev/schemas/user-secrets.yaml#/properties/keyPairs/items`

*   [Module](./service-properties-modules-module.md) – `https://fluence.dev/schemas/service.yaml#/properties/modules/additionalProperties`

*   [Module](./service-properties-modules-properties-module.md) – `https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade`

*   [Module overrides](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-overrides-module-overrides.md) – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/overrideModules/additionalProperties`

*   [Modules](./service-properties-modules.md "Service must have a facade module") – `https://fluence.dev/schemas/service.yaml#/properties/modules`

*   [Mounted binaries](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-overrides-module-overrides-properties-mounted-binaries.md "A map of binary executable files that module is allowed to call") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/overrideModules/additionalProperties/properties/mountedBinaries`

*   [Mounted binaries](./module-properties-mounted-binaries.md "A map of binary executable files that module is allowed to call") – `https://fluence.dev/schemas/module.yaml#/properties/mountedBinaries`

*   [Mounted binaries](./service-properties-modules-module-properties-mounted-binaries.md "A map of binary executable files that module is allowed to call") – `https://fluence.dev/schemas/service.yaml#/properties/modules/additionalProperties/properties/mountedBinaries`

*   [Mounted binaries](./service-properties-modules-properties-module-properties-mounted-binaries.md "A map of binary executable files that module is allowed to call") – `https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/mountedBinaries`

*   [Overrides](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-overrides.md "A map of modules to override") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/overrideModules`

*   [Peer ids](./fluence-properties-peer-ids.md "A map of named peerIds") – `https://fluence.dev/schemas/fluence.yaml#/properties/peerIds`

*   [Services](./app-properties-services.md "A map of the deployed services") – `https://fluence.dev/schemas/app.yaml#/properties/services`

*   [Services](./fluence-properties-services.md) – `https://fluence.dev/schemas/fluence.yaml#/properties/services`

*   [Volumes](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-overrides-module-overrides-properties-volumes.md "A map of accessible files and their aliases") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/overrideModules/additionalProperties/properties/volumes`

*   [Volumes](./module-properties-volumes.md "A map of accessible files and their aliases") – `https://fluence.dev/schemas/module.yaml#/properties/volumes`

*   [Volumes](./service-properties-modules-module-properties-volumes.md "A map of accessible files and their aliases") – `https://fluence.dev/schemas/service.yaml#/properties/modules/additionalProperties/properties/volumes`

*   [Volumes](./service-properties-modules-properties-module-properties-volumes.md "A map of accessible files and their aliases") – `https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/volumes`

*   [npm dependencies](./fluence-properties-dependencies-properties-npm-dependencies.md "A map of the exact npm dependency versions") – `https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/npm`

### Arrays

*   [A list of deployed services](./app-properties-services-deployment-ids-a-list-of-deployed-services.md) – `https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties/additionalProperties`

*   [Deployment list](./fluence-properties-services-deployment-id-map-properties-deployment-list.md "List of deployments for the particular service") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy`

*   [Key Pairs](./project-secrets-properties-key-pairs.md "Key Pairs available for the particular project") – `https://fluence.dev/schemas/project-secrets.yaml#/properties/keyPairs`

*   [Key Pairs](./user-secrets-properties-key-pairs.md) – `https://fluence.dev/schemas/user-secrets.yaml#/properties/keyPairs`

*   [Multi addresses](./app-properties-relays-oneof-multi-addresses.md) – `https://fluence.dev/schemas/app.yaml#/properties/relays/oneOf/1`

*   [Multi addresses](./fluence-properties-relays-oneof-multi-addresses.md) – `https://fluence.dev/schemas/fluence.yaml#/properties/relays/oneOf/1`

*   [Peer ids](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-peer-ids.md "Peer ids or peer id names to deploy to") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/peerIds`

*   [Preopened files](./fluence-properties-services-deployment-id-map-properties-deployment-list-deployment-properties-overrides-module-overrides-properties-preopened-files.md "A list of files and directories that this module could access with WASI") – `https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy/items/properties/overrideModules/additionalProperties/properties/preopenedFiles`

*   [Preopened files](./module-properties-preopened-files.md "A list of files and directories that this module could access with WASI") – `https://fluence.dev/schemas/module.yaml#/properties/preopenedFiles`

*   [Preopened files](./service-properties-modules-module-properties-preopened-files.md "A list of files and directories that this module could access with WASI") – `https://fluence.dev/schemas/service.yaml#/properties/modules/additionalProperties/properties/preopenedFiles`

*   [Preopened files](./service-properties-modules-properties-module-properties-preopened-files.md "A list of files and directories that this module could access with WASI") – `https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/preopenedFiles`
