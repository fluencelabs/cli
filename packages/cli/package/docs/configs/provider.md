# provider.yaml

Defines provider configuration

## Properties

| Property              | Type                           | Required | Description                                                              |
|-----------------------|--------------------------------|----------|--------------------------------------------------------------------------|
| `capacityCommitments` | [object](#capacitycommitments) | **Yes**  | A map with nox names as keys and capacity commitments as values          |
| `computePeers`        | [object](#computepeers)        | **Yes**  | A map with compute peer names as keys and compute peer configs as values |
| `offers`              | [object](#offers)              | **Yes**  | A map with offer names as keys and offer configs as values               |
| `providerName`        | string                         | **Yes**  | Provider name. Must not be empty                                         |
| `version`             | integer                        | **Yes**  | Config version                                                           |
| `resourceNames`       | [object](#resourcenames)       | No       | A map with resource names as keys and on-chain resource IDs as values    |

## capacityCommitments

A map with nox names as keys and capacity commitments as values

### Properties

| Property  | Type               | Required | Description                   |
|-----------|--------------------|----------|-------------------------------|
| `noxName` | [object](#noxname) | No       | Defines a capacity commitment |

### noxName

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
| `ip`        | [object](#ip)        | **Yes**  | Defines an IP resource       |
| `ram`       | [object](#ram)       | **Yes**  | Defines a RAM resource       |
| `storage`   | [object](#storage)[] | **Yes**  |                              |
| `vcpu`      | [object](#vcpu)      | **Yes**  | Defines a vCPU resource      |

##### bandwidth

Defines a bandwidth resource

###### Properties

| Property | Type    | Required | Description       |
|----------|---------|----------|-------------------|
| `name`   | string  | **Yes**  |                   |
| `supply` | integer | **Yes**  | Bandwidth in Mbps |

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

| Property  | Type               | Required | Description                                                                          |
|-----------|--------------------|----------|--------------------------------------------------------------------------------------|
| `name`    | string             | **Yes**  |                                                                                      |
| `supply`  | integer            | **Yes**  | Amount of RAM in GB                                                                  |
| `details` | [object](#details) | No       | RAM details not related to matching but visible to the user for information purposes |

###### details

RAM details not related to matching but visible to the user for information purposes

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

| Property  | Type               | Required | Description                                                                              |
|-----------|--------------------|----------|------------------------------------------------------------------------------------------|
| `name`    | string             | **Yes**  |                                                                                          |
| `supply`  | integer            | **Yes**  | Amount of storage in GB                                                                  |
| `details` | [object](#details) | No       | Storage details not related to matching but visible to the user for information purposes |

###### details

Storage details not related to matching but visible to the user for information purposes

**Properties**

| Property               | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| `manufacturer`         | string | No       |             |
| `model`                | string | No       |             |
| `sequentialWriteSpeed` | number | No       |             |

##### vcpu

Defines a vCPU resource

###### Properties

| Property  | Type               | Required | Description                                                                          |
|-----------|--------------------|----------|--------------------------------------------------------------------------------------|
| `name`    | string             | **Yes**  |                                                                                      |
| `supply`  | integer            | **Yes**  | Number of vCPU cores. Currently it's 1 vCPU per 1 CPU core                           |
| `details` | [object](#details) | No       | CPU details not related to matching but visible to the user for information purposes |

###### details

CPU details not related to matching but visible to the user for information purposes

**Properties**

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `model`  | string | No       |             |

## offers

A map with offer names as keys and offer configs as values

### Properties

| Property | Type             | Required | Description              |
|----------|------------------|----------|--------------------------|
| `Offer`  | [object](#offer) | No       | Defines a provider offer |

### Offer

Defines a provider offer

#### Properties

| Property             | Type                 | Required | Description                                                                        |
|----------------------|----------------------|----------|------------------------------------------------------------------------------------|
| `computePeers`       | string[]             | **Yes**  | Compute peers participating in this offer                                          |
| `maxProtocolVersion` | integer              | No       | Max protocol version. Must be more then or equal to minProtocolVersion. Default: 1 |
| `minProtocolVersion` | integer              | No       | Min protocol version. Must be less then or equal to maxProtocolVersion. Default: 1 |
| `resources`          | [object](#resources) | No       | Resource prices for the offer                                                      |

#### resources

Resource prices for the offer

##### Properties

| Property    | Type                 | Required | Description |
|-------------|----------------------|----------|-------------|
| `bandwidth` | [object](#bandwidth) | **Yes**  |             |
| `ip`        | [object](#ip)        | **Yes**  |             |
| `ram`       | [object](#ram)       | **Yes**  |             |
| `storage`   | [object](#storage)   | **Yes**  |             |
| `vcpu`      | [object](#vcpu)      | **Yes**  |             |

##### bandwidth

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

##### vcpu

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## resourceNames

A map with resource names as keys and on-chain resource IDs as values

### Properties

| Property       | Type   | Required | Description                 |
|----------------|--------|----------|-----------------------------|
| `resourceName` | string | No       | On-chain ID of the resource |

