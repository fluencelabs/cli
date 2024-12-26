# provider.yaml

Defines provider configuration

## Properties

| Property              | Type                           | Required | Description                                                                |
|-----------------------|--------------------------------|----------|----------------------------------------------------------------------------|
| `capacityCommitments` | [object](#capacitycommitments) | **Yes**  | A map with computePeer names as keys and capacity commitments as values    |
| `computePeers`        | [object](#computepeers)        | **Yes**  | A map with compute peer names as keys and compute peer configs as values   |
| `offers`              | [object](#offers)              | **Yes**  | A map with offer names as keys and offer configs as values                 |
| `providerName`        | string                         | **Yes**  | Provider name. Must not be empty                                           |
| `version`             | integer                        | **Yes**  | Config version                                                             |
| `resources`           | [object](#resources)           | No       | A map with resource type names as keys and resource names object as values |

## capacityCommitments

A map with computePeer names as keys and capacity commitments as values

### Properties

| Property          | Type                       | Required | Description                   |
|-------------------|----------------------------|----------|-------------------------------|
| `computePeerName` | [object](#computepeername) | No       | Defines a capacity commitment |

### computePeerName

Defines a capacity commitment

#### Properties

| Property       | Type   | Required | Description                                                                   |
|----------------|--------|----------|-------------------------------------------------------------------------------|
| `duration`     | string | **Yes**  | Duration of the commitment in human-readable format. Example: 1 months 1 days |
| `stakerReward` | number | **Yes**  | Staker reward in percent                                                      |
| `delegator`    | string | No       | Delegator address                                                             |

## computePeers

A map with compute peer names as keys and compute peer configs as values

### Properties

| Property          | Type                       | Required | Description            |
|-------------------|----------------------------|----------|------------------------|
| `computePeerName` | [object](#computepeername) | No       | Defines a compute peer |

### computePeerName

Defines a compute peer

#### Properties

| Property         | Type                 | Required | Description                              |
|------------------|----------------------|----------|------------------------------------------|
| `kubeconfigPath` | string               | **Yes**  | Path to the kubeconfig file              |
| `resources`      | [object](#resources) | **Yes**  | Resources available on this compute peer |

#### resources

Resources available on this compute peer

##### Properties

| Property    | Type                 | Required | Description                  |
|-------------|----------------------|----------|------------------------------|
| `bandwidth` | [object](#bandwidth) | **Yes**  | Defines a bandwidth resource |
| `cpu`       | [object](#cpu)       | **Yes**  | Defines a CPU resource       |
| `ip`        | [object](#ip)        | **Yes**  | Defines an IP resource       |
| `ram`       | [object](#ram)       | **Yes**  | Defines a RAM resource       |
| `storage`   | [object](#storage)[] | **Yes**  |                              |

##### bandwidth

Defines a bandwidth resource

###### Properties

| Property | Type    | Required | Description       |
|----------|---------|----------|-------------------|
| `name`   | string  | **Yes**  |                   |
| `supply` | integer | **Yes**  | Bandwidth in Mbps |

##### cpu

Defines a CPU resource

###### Properties

| Property  | Type               | Required | Description                                                                                             |
|-----------|--------------------|----------|---------------------------------------------------------------------------------------------------------|
| `name`    | string             | **Yes**  |                                                                                                         |
| `supply`  | integer            | **Yes**  | Number of physical cores                                                                                |
| `details` | [object](#details) | No       | Override or extend CPU details not related to matching but visible to the user for information purposes |

###### details

Override or extend CPU details not related to matching but visible to the user for information purposes

**Properties**

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `model`  | string | No       |             |

##### ip

Defines an IP resource

###### Properties

| Property | Type                | Required | Description |
|----------|---------------------|----------|-------------|
| `name`   | string              | **Yes**  |             |
| `supply` | [object](#supply)[] | **Yes**  | IP supply   |

###### supply

Either specify only a `start` property (if you want a single IP) or `start` and `end` properties (if you want a range) or `cidr` property (if you want a CIDR notation)

| Property | Type | Required | Description |
|----------|------|----------|-------------|

##### ram

Defines a RAM resource

###### Properties

| Property  | Type               | Required | Description                                                                                             |
|-----------|--------------------|----------|---------------------------------------------------------------------------------------------------------|
| `name`    | string             | **Yes**  |                                                                                                         |
| `supply`  | integer            | **Yes**  | Amount of RAM in GB                                                                                     |
| `details` | [object](#details) | No       | Override or extend RAM details not related to matching but visible to the user for information purposes |

###### details

Override or extend RAM details not related to matching but visible to the user for information purposes

**Properties**

| Property       | Type    | Required | Description |
|----------------|---------|----------|-------------|
| `ecc`          | boolean | No       |             |
| `manufacturer` | string  | No       |             |
| `model`        | string  | No       |             |
| `speed`        | integer | No       |             |

##### storage

Defines a storage resource

###### Properties

| Property  | Type               | Required | Description                                                                                                 |
|-----------|--------------------|----------|-------------------------------------------------------------------------------------------------------------|
| `name`    | string             | **Yes**  |                                                                                                             |
| `supply`  | integer            | **Yes**  | Amount of storage in GB                                                                                     |
| `details` | [object](#details) | No       | Override or extend Storage details not related to matching but visible to the user for information purposes |

###### details

Override or extend Storage details not related to matching but visible to the user for information purposes

**Properties**

| Property               | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| `manufacturer`         | string | No       |             |
| `model`                | string | No       |             |
| `sequentialWriteSpeed` | number | No       |             |

## offers

A map with offer names as keys and offer configs as values

### Properties

| Property | Type             | Required | Description              |
|----------|------------------|----------|--------------------------|
| `Offer`  | [object](#offer) | No       | Defines a provider offer |

### Offer

Defines a provider offer

#### Properties

| Property             | Type                      | Required | Description                                                                        |
|----------------------|---------------------------|----------|------------------------------------------------------------------------------------|
| `computePeers`       | string[]                  | **Yes**  | Compute peers participating in this offer                                          |
| `maxProtocolVersion` | integer                   | No       | Max protocol version. Must be more then or equal to minProtocolVersion. Default: 1 |
| `minProtocolVersion` | integer                   | No       | Min protocol version. Must be less then or equal to maxProtocolVersion. Default: 1 |
| `resourcePrices`     | [object](#resourceprices) | No       | Resource prices for the offer                                                      |

#### resourcePrices

Resource prices for the offer

##### Properties

| Property    | Type                 | Required | Description |
|-------------|----------------------|----------|-------------|
| `bandwidth` | [object](#bandwidth) | **Yes**  |             |
| `cpu`       | [object](#cpu)       | **Yes**  |             |
| `ip`        | [object](#ip)        | **Yes**  |             |
| `ram`       | [object](#ram)       | **Yes**  |             |
| `storage`   | [object](#storage)   | **Yes**  |             |

##### bandwidth

| Property | Type | Required | Description |
|----------|------|----------|-------------|

##### cpu

| Property | Type | Required | Description |
|----------|------|----------|-------------|

##### ip

| Property | Type | Required | Description |
|----------|------|----------|-------------|

##### ram

| Property | Type | Required | Description |
|----------|------|----------|-------------|

##### storage

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## resources

A map with resource type names as keys and resource names object as values

### Properties

| Property    | Type                 | Required | Description                                                                          |
|-------------|----------------------|----------|--------------------------------------------------------------------------------------|
| `bandwidth` | [object](#bandwidth) | No       | A map with bandwidth resource names as keys and bandwidth resource objects as values |
| `cpu`       | [object](#cpu)       | No       | A map with CPU resource names as keys and CPU resource objects as values             |
| `ip`        | [object](#ip)        | No       | A map with IP resource names as keys and IP resource objects as values               |
| `ram`       | [object](#ram)       | No       | A map with RAM resource names as keys and RAM resource objects as values             |
| `storage`   | [object](#storage)   | No       | A map with storage resource names as keys and storage resource objects as values     |

### bandwidth

A map with bandwidth resource names as keys and bandwidth resource objects as values

#### Properties

| Property                | Type                             | Required | Description                  |
|-------------------------|----------------------------------|----------|------------------------------|
| `bandwidthResourceName` | [object](#bandwidthresourcename) | No       | Defines a bandwidth resource |

#### bandwidthResourceName

Defines a bandwidth resource

##### Properties

| Property | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| `id`     | string | **Yes**  | On-chain ID of the resource |

### cpu

A map with CPU resource names as keys and CPU resource objects as values

#### Properties

| Property          | Type                       | Required | Description            |
|-------------------|----------------------------|----------|------------------------|
| `cpuResourceName` | [object](#cpuresourcename) | No       | Defines a CPU resource |

#### cpuResourceName

Defines a CPU resource

##### Properties

| Property  | Type               | Required | Description                                                                          |
|-----------|--------------------|----------|--------------------------------------------------------------------------------------|
| `id`      | string             | **Yes**  | On-chain ID of the resource                                                          |
| `details` | [object](#details) | No       | CPU details not related to matching but visible to the user for information purposes |

##### details

CPU details not related to matching but visible to the user for information purposes

###### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `model`  | string | No       |             |

### ip

A map with IP resource names as keys and IP resource objects as values

#### Properties

| Property         | Type                      | Required | Description            |
|------------------|---------------------------|----------|------------------------|
| `ipResourceName` | [object](#ipresourcename) | No       | Defines an IP resource |

#### ipResourceName

Defines an IP resource

##### Properties

| Property | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| `id`     | string | **Yes**  | On-chain ID of the resource |

### ram

A map with RAM resource names as keys and RAM resource objects as values

#### Properties

| Property          | Type                       | Required | Description            |
|-------------------|----------------------------|----------|------------------------|
| `ramResourceName` | [object](#ramresourcename) | No       | Defines a RAM resource |

#### ramResourceName

Defines a RAM resource

##### Properties

| Property  | Type               | Required | Description                                                                          |
|-----------|--------------------|----------|--------------------------------------------------------------------------------------|
| `id`      | string             | **Yes**  | On-chain ID of the resource                                                          |
| `details` | [object](#details) | No       | RAM details not related to matching but visible to the user for information purposes |

##### details

RAM details not related to matching but visible to the user for information purposes

###### Properties

| Property       | Type    | Required | Description |
|----------------|---------|----------|-------------|
| `ecc`          | boolean | No       |             |
| `manufacturer` | string  | No       |             |
| `model`        | string  | No       |             |
| `speed`        | integer | No       |             |

### storage

A map with storage resource names as keys and storage resource objects as values

#### Properties

| Property              | Type                           | Required | Description                |
|-----------------------|--------------------------------|----------|----------------------------|
| `storageResourceName` | [object](#storageresourcename) | No       | Defines a storage resource |

#### storageResourceName

Defines a storage resource

##### Properties

| Property  | Type               | Required | Description                                                                              |
|-----------|--------------------|----------|------------------------------------------------------------------------------------------|
| `id`      | string             | **Yes**  | On-chain ID of the resource                                                              |
| `details` | [object](#details) | No       | Storage details not related to matching but visible to the user for information purposes |

##### details

Storage details not related to matching but visible to the user for information purposes

###### Properties

| Property               | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| `manufacturer`         | string | No       |             |
| `model`                | string | No       |             |
| `sequentialWriteSpeed` | number | No       |             |

