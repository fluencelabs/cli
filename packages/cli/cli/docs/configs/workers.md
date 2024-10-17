# workers.yaml

A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command

## Properties

| Property  | Type             | Required | Description                                                                                        |
|-----------|------------------|----------|----------------------------------------------------------------------------------------------------|
| `version` | integer          | **Yes**  | Config version                                                                                     |
| `deals`   | [object](#deals) | No       | Info about deals created when deploying workers that is stored by environment that you deployed to |
| `hosts`   | [object](#hosts) | No       | Info about directly deployed workers that is stored by environment that you deployed to            |

## deals

Info about deals created when deploying workers that is stored by environment that you deployed to

### Properties

| Property  | Type               | Required | Description            |
|-----------|--------------------|----------|------------------------|
| `custom`  | [object](#custom)  | No       | A map of created deals |
| `local`   | [object](#local)   | No       | A map of created deals |
| `mainnet` | [object](#mainnet) | No       | A map of created deals |
| `stage`   | [object](#stage)   | No       | A map of created deals |
| `testnet` | [object](#testnet) | No       | A map of created deals |

### custom

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description                                                                                                                 |
|-------------------------------|----------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       | Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua |

#### Worker_deployed_using_deals

Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua

##### Properties

| Property         | Type    | Required | Description                                                                                                                                                                             |
|------------------|---------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `chainNetworkId` | integer | **Yes**  | Blockchain network id that was used when deploying workers                                                                                                                              |
| `dealIdOriginal` | string  | **Yes**  | Blockchain transaction id that you get when deploy workers. Can be used in aqua to get worker and host ids. Check out example in the aqua generated in the default template             |
| `dealId`         | string  | **Yes**  | Lowercased version of dealIdOriginal without 0x prefix. Currently unused. Was previously used to resolve workers in aqua                                                                |
| `definition`     | string  | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `timestamp`      | string  | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |
| `chainNetwork`   | string  | No       | DEPRECATED. Blockchain network name that was used when deploying workers Possible values are: `kras`, `dar`, `stage`, `local`.                                                          |
| `matched`        | boolean | No       | Is deal matched                                                                                                                                                                         |

### local

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description                                                                                                                 |
|-------------------------------|----------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       | Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua |

#### Worker_deployed_using_deals

Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua

##### Properties

| Property         | Type    | Required | Description                                                                                                                                                                             |
|------------------|---------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `chainNetworkId` | integer | **Yes**  | Blockchain network id that was used when deploying workers                                                                                                                              |
| `dealIdOriginal` | string  | **Yes**  | Blockchain transaction id that you get when deploy workers. Can be used in aqua to get worker and host ids. Check out example in the aqua generated in the default template             |
| `dealId`         | string  | **Yes**  | Lowercased version of dealIdOriginal without 0x prefix. Currently unused. Was previously used to resolve workers in aqua                                                                |
| `definition`     | string  | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `timestamp`      | string  | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |
| `chainNetwork`   | string  | No       | DEPRECATED. Blockchain network name that was used when deploying workers Possible values are: `kras`, `dar`, `stage`, `local`.                                                          |
| `matched`        | boolean | No       | Is deal matched                                                                                                                                                                         |

### mainnet

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description                                                                                                                 |
|-------------------------------|----------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       | Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua |

#### Worker_deployed_using_deals

Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua

##### Properties

| Property         | Type    | Required | Description                                                                                                                                                                             |
|------------------|---------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `chainNetworkId` | integer | **Yes**  | Blockchain network id that was used when deploying workers                                                                                                                              |
| `dealIdOriginal` | string  | **Yes**  | Blockchain transaction id that you get when deploy workers. Can be used in aqua to get worker and host ids. Check out example in the aqua generated in the default template             |
| `dealId`         | string  | **Yes**  | Lowercased version of dealIdOriginal without 0x prefix. Currently unused. Was previously used to resolve workers in aqua                                                                |
| `definition`     | string  | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `timestamp`      | string  | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |
| `chainNetwork`   | string  | No       | DEPRECATED. Blockchain network name that was used when deploying workers Possible values are: `kras`, `dar`, `stage`, `local`.                                                          |
| `matched`        | boolean | No       | Is deal matched                                                                                                                                                                         |

### stage

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description                                                                                                                 |
|-------------------------------|----------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       | Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua |

#### Worker_deployed_using_deals

Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua

##### Properties

| Property         | Type    | Required | Description                                                                                                                                                                             |
|------------------|---------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `chainNetworkId` | integer | **Yes**  | Blockchain network id that was used when deploying workers                                                                                                                              |
| `dealIdOriginal` | string  | **Yes**  | Blockchain transaction id that you get when deploy workers. Can be used in aqua to get worker and host ids. Check out example in the aqua generated in the default template             |
| `dealId`         | string  | **Yes**  | Lowercased version of dealIdOriginal without 0x prefix. Currently unused. Was previously used to resolve workers in aqua                                                                |
| `definition`     | string  | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `timestamp`      | string  | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |
| `chainNetwork`   | string  | No       | DEPRECATED. Blockchain network name that was used when deploying workers Possible values are: `kras`, `dar`, `stage`, `local`.                                                          |
| `matched`        | boolean | No       | Is deal matched                                                                                                                                                                         |

### testnet

A map of created deals

#### Properties

| Property                      | Type                                   | Required | Description                                                                                                                 |
|-------------------------------|----------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       | Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua |

#### Worker_deployed_using_deals

Contains data related to your deployment, including, most importantly, deal id, that can be used to resolve workers in aqua

##### Properties

| Property         | Type    | Required | Description                                                                                                                                                                             |
|------------------|---------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `chainNetworkId` | integer | **Yes**  | Blockchain network id that was used when deploying workers                                                                                                                              |
| `dealIdOriginal` | string  | **Yes**  | Blockchain transaction id that you get when deploy workers. Can be used in aqua to get worker and host ids. Check out example in the aqua generated in the default template             |
| `dealId`         | string  | **Yes**  | Lowercased version of dealIdOriginal without 0x prefix. Currently unused. Was previously used to resolve workers in aqua                                                                |
| `definition`     | string  | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `timestamp`      | string  | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |
| `chainNetwork`   | string  | No       | DEPRECATED. Blockchain network name that was used when deploying workers Possible values are: `kras`, `dar`, `stage`, `local`.                                                          |
| `matched`        | boolean | No       | Is deal matched                                                                                                                                                                         |

## hosts

Info about directly deployed workers that is stored by environment that you deployed to

### Properties

| Property  | Type               | Required | Description                        |
|-----------|--------------------|----------|------------------------------------|
| `custom`  | [object](#custom)  | No       | A map of directly deployed workers |
| `local`   | [object](#local)   | No       | A map of directly deployed workers |
| `mainnet` | [object](#mainnet) | No       | A map of directly deployed workers |
| `stage`   | [object](#stage)   | No       | A map of directly deployed workers |
| `testnet` | [object](#testnet) | No       | A map of directly deployed workers |

### custom

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description                                                                                                                                                    |
|----------------------------------------|-------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       | Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua |

#### Worker_deployed_using_direct_hosting

Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua

##### Properties

| Property              | Type                             | Required | Description                                                                                                                                                                             |
|-----------------------|----------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `definition`          | string                           | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `dummyDealId`         | string                           | **Yes**  | random string generated by CLI, used in Nox. You can get worker id from it                                                                                                              |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                                                                                                                                                           |
| `relayId`             | string                           | **Yes**  | relay peer id that was used when deploying                                                                                                                                              |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description                                                        |
|-------------|--------|----------|--------------------------------------------------------------------|
| `host_id`   | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |
| `spell_id`  | string | **Yes**  | id of the installation spell, can be used to e.g. print spell logs |
| `worker_id` | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |

### local

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description                                                                                                                                                    |
|----------------------------------------|-------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       | Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua |

#### Worker_deployed_using_direct_hosting

Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua

##### Properties

| Property              | Type                             | Required | Description                                                                                                                                                                             |
|-----------------------|----------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `definition`          | string                           | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `dummyDealId`         | string                           | **Yes**  | random string generated by CLI, used in Nox. You can get worker id from it                                                                                                              |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                                                                                                                                                           |
| `relayId`             | string                           | **Yes**  | relay peer id that was used when deploying                                                                                                                                              |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description                                                        |
|-------------|--------|----------|--------------------------------------------------------------------|
| `host_id`   | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |
| `spell_id`  | string | **Yes**  | id of the installation spell, can be used to e.g. print spell logs |
| `worker_id` | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |

### mainnet

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description                                                                                                                                                    |
|----------------------------------------|-------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       | Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua |

#### Worker_deployed_using_direct_hosting

Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua

##### Properties

| Property              | Type                             | Required | Description                                                                                                                                                                             |
|-----------------------|----------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `definition`          | string                           | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `dummyDealId`         | string                           | **Yes**  | random string generated by CLI, used in Nox. You can get worker id from it                                                                                                              |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                                                                                                                                                           |
| `relayId`             | string                           | **Yes**  | relay peer id that was used when deploying                                                                                                                                              |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description                                                        |
|-------------|--------|----------|--------------------------------------------------------------------|
| `host_id`   | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |
| `spell_id`  | string | **Yes**  | id of the installation spell, can be used to e.g. print spell logs |
| `worker_id` | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |

### stage

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description                                                                                                                                                    |
|----------------------------------------|-------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       | Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua |

#### Worker_deployed_using_direct_hosting

Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua

##### Properties

| Property              | Type                             | Required | Description                                                                                                                                                                             |
|-----------------------|----------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `definition`          | string                           | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `dummyDealId`         | string                           | **Yes**  | random string generated by CLI, used in Nox. You can get worker id from it                                                                                                              |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                                                                                                                                                           |
| `relayId`             | string                           | **Yes**  | relay peer id that was used when deploying                                                                                                                                              |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description                                                        |
|-------------|--------|----------|--------------------------------------------------------------------|
| `host_id`   | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |
| `spell_id`  | string | **Yes**  | id of the installation spell, can be used to e.g. print spell logs |
| `worker_id` | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |

### testnet

A map of directly deployed workers

#### Properties

| Property                               | Type                                            | Required | Description                                                                                                                                                    |
|----------------------------------------|-------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       | Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua |

#### Worker_deployed_using_direct_hosting

Contains data related to your direct deployment. Most importantly, it contains ids in installation_spells property that can be used to resolve workers in aqua

##### Properties

| Property              | Type                             | Required | Description                                                                                                                                                                             |
|-----------------------|----------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `definition`          | string                           | **Yes**  | CID of uploaded to IPFS App Definition, which contains the data about everything that you are trying to deploy, including spells, service and module configs and CIDs for service wasms |
| `dummyDealId`         | string                           | **Yes**  | random string generated by CLI, used in Nox. You can get worker id from it                                                                                                              |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                                                                                                                                                           |
| `relayId`             | string                           | **Yes**  | relay peer id that was used when deploying                                                                                                                                              |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed                                                                                                                                  |

##### installation_spells

###### Properties

| Property    | Type   | Required | Description                                                        |
|-------------|--------|----------|--------------------------------------------------------------------|
| `host_id`   | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |
| `spell_id`  | string | **Yes**  | id of the installation spell, can be used to e.g. print spell logs |
| `worker_id` | string | **Yes**  | Can be used to access worker in aqua: `on s.workerId via s.hostId` |

