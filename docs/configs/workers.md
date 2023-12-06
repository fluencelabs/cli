# workers.yaml

A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command

## Properties

| Property  | Type             | Required | Description |
|-----------|------------------|----------|-------------|
| `version` | number           | **Yes**  |             |
| `deals`   | [object](#deals) | No       |             |
| `hosts`   | [object](#hosts) | No       |             |

## deals

### Properties

| Property  | Type               | Required | Description            |
|-----------|--------------------|----------|------------------------|
| `custom`  | [object](#custom)  | No       | A map of created deals |
| `kras`    | [object](#kras)    | No       | A map of created deals |
| `local`   | [object](#local)   | No       | A map of created deals |
| `stage`   | [object](#stage)   | No       | A map of created deals |
| `testnet` | [object](#testnet) | No       | A map of created deals |

### custom

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description |
|-------------------------------|----------------------------------------|----------|-------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       |             |

#### Worker_deployed_using_deals

##### Properties

| Property         | Type   | Required | Description                                               |
|------------------|--------|----------|-----------------------------------------------------------|
| `chainNetworkId` | number | **Yes**  |                                                           |
| `chainNetwork`   | string | **Yes**  | Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `dealIdOriginal` | string | **Yes**  |                                                           |
| `dealId`         | string | **Yes**  |                                                           |
| `definition`     | string | **Yes**  |                                                           |
| `timestamp`      | string | **Yes**  | ISO timestamp of the time when the worker was deployed    |

### kras

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description |
|-------------------------------|----------------------------------------|----------|-------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       |             |

#### Worker_deployed_using_deals

##### Properties

| Property         | Type   | Required | Description                                               |
|------------------|--------|----------|-----------------------------------------------------------|
| `chainNetworkId` | number | **Yes**  |                                                           |
| `chainNetwork`   | string | **Yes**  | Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `dealIdOriginal` | string | **Yes**  |                                                           |
| `dealId`         | string | **Yes**  |                                                           |
| `definition`     | string | **Yes**  |                                                           |
| `timestamp`      | string | **Yes**  | ISO timestamp of the time when the worker was deployed    |

### local

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description |
|-------------------------------|----------------------------------------|----------|-------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       |             |

#### Worker_deployed_using_deals

##### Properties

| Property         | Type   | Required | Description                                               |
|------------------|--------|----------|-----------------------------------------------------------|
| `chainNetworkId` | number | **Yes**  |                                                           |
| `chainNetwork`   | string | **Yes**  | Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `dealIdOriginal` | string | **Yes**  |                                                           |
| `dealId`         | string | **Yes**  |                                                           |
| `definition`     | string | **Yes**  |                                                           |
| `timestamp`      | string | **Yes**  | ISO timestamp of the time when the worker was deployed    |

### stage

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description |
|-------------------------------|----------------------------------------|----------|-------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       |             |

#### Worker_deployed_using_deals

##### Properties

| Property         | Type   | Required | Description                                               |
|------------------|--------|----------|-----------------------------------------------------------|
| `chainNetworkId` | number | **Yes**  |                                                           |
| `chainNetwork`   | string | **Yes**  | Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `dealIdOriginal` | string | **Yes**  |                                                           |
| `dealId`         | string | **Yes**  |                                                           |
| `definition`     | string | **Yes**  |                                                           |
| `timestamp`      | string | **Yes**  | ISO timestamp of the time when the worker was deployed    |

### testnet

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description |
|-------------------------------|----------------------------------------|----------|-------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       |             |

#### Worker_deployed_using_deals

##### Properties

| Property         | Type   | Required | Description                                               |
|------------------|--------|----------|-----------------------------------------------------------|
| `chainNetworkId` | number | **Yes**  |                                                           |
| `chainNetwork`   | string | **Yes**  | Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `dealIdOriginal` | string | **Yes**  |                                                           |
| `dealId`         | string | **Yes**  |                                                           |
| `definition`     | string | **Yes**  |                                                           |
| `timestamp`      | string | **Yes**  | ISO timestamp of the time when the worker was deployed    |

## hosts

### Properties

| Property  | Type               | Required | Description                        |
|-----------|--------------------|----------|------------------------------------|
| `custom`  | [object](#custom)  | No       | A map of directly deployed workers |
| `kras`    | [object](#kras)    | No       | A map of directly deployed workers |
| `local`   | [object](#local)   | No       | A map of directly deployed workers |
| `stage`   | [object](#stage)   | No       | A map of directly deployed workers |
| `testnet` | [object](#testnet) | No       | A map of directly deployed workers |

### custom

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description |
|----------------------------------------|-------------------------------------------------|----------|-------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       |             |

#### Worker_deployed_using_direct_hosting

##### Properties

| Property              | Type                             | Required | Description                                            |
|-----------------------|----------------------------------|----------|--------------------------------------------------------|
| `definition`          | string                           | **Yes**  |                                                        |
| `dummyDealId`         | string                           | **Yes**  |                                                        |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                          |
| `relayId`             | string                           | **Yes**  |                                                        |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `host_id`   | string | **Yes**  |             |
| `spell_id`  | string | **Yes**  |             |
| `worker_id` | string | **Yes**  |             |

### kras

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description |
|----------------------------------------|-------------------------------------------------|----------|-------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       |             |

#### Worker_deployed_using_direct_hosting

##### Properties

| Property              | Type                             | Required | Description                                            |
|-----------------------|----------------------------------|----------|--------------------------------------------------------|
| `definition`          | string                           | **Yes**  |                                                        |
| `dummyDealId`         | string                           | **Yes**  |                                                        |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                          |
| `relayId`             | string                           | **Yes**  |                                                        |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `host_id`   | string | **Yes**  |             |
| `spell_id`  | string | **Yes**  |             |
| `worker_id` | string | **Yes**  |             |

### local

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description |
|----------------------------------------|-------------------------------------------------|----------|-------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       |             |

#### Worker_deployed_using_direct_hosting

##### Properties

| Property              | Type                             | Required | Description                                            |
|-----------------------|----------------------------------|----------|--------------------------------------------------------|
| `definition`          | string                           | **Yes**  |                                                        |
| `dummyDealId`         | string                           | **Yes**  |                                                        |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                          |
| `relayId`             | string                           | **Yes**  |                                                        |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `host_id`   | string | **Yes**  |             |
| `spell_id`  | string | **Yes**  |             |
| `worker_id` | string | **Yes**  |             |

### stage

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description |
|----------------------------------------|-------------------------------------------------|----------|-------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       |             |

#### Worker_deployed_using_direct_hosting

##### Properties

| Property              | Type                             | Required | Description                                            |
|-----------------------|----------------------------------|----------|--------------------------------------------------------|
| `definition`          | string                           | **Yes**  |                                                        |
| `dummyDealId`         | string                           | **Yes**  |                                                        |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                          |
| `relayId`             | string                           | **Yes**  |                                                        |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `host_id`   | string | **Yes**  |             |
| `spell_id`  | string | **Yes**  |             |
| `worker_id` | string | **Yes**  |             |

### testnet

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description |
|----------------------------------------|-------------------------------------------------|----------|-------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       |             |

#### Worker_deployed_using_direct_hosting

##### Properties

| Property              | Type                             | Required | Description                                            |
|-----------------------|----------------------------------|----------|--------------------------------------------------------|
| `definition`          | string                           | **Yes**  |                                                        |
| `dummyDealId`         | string                           | **Yes**  |                                                        |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                          |
| `relayId`             | string                           | **Yes**  |                                                        |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `host_id`   | string | **Yes**  |             |
| `spell_id`  | string | **Yes**  |             |
| `worker_id` | string | **Yes**  |             |

