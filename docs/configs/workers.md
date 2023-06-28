# workers.yaml

A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command

## Properties

| Property  | Type             | Required | Description               |
|-----------|------------------|----------|---------------------------|
| `version` | number           | **Yes**  |                           |
| `deals`   | [object](#deals) | No       | A map of created deals    |
| `hosts`   | [object](#hosts) | No       | A map of deployed workers |

## deals

A map of created deals

### Properties

| Property                      | Type                                   | Required | Description |
|-------------------------------|----------------------------------------|----------|-------------|
| `Worker_deployed_using_deals` | [object](#worker_deployed_using_deals) | No       |             |

### Worker_deployed_using_deals

#### Properties

| Property         | Type   | Required | Description                                               |
|------------------|--------|----------|-----------------------------------------------------------|
| `chainNetworkId` | number | **Yes**  |                                                           |
| `chainNetwork`   | string | **Yes**  | Possible values are: `kras`, `stage`, `testnet`, `local`. |
| `dealIdOriginal` | string | **Yes**  |                                                           |
| `dealId`         | string | **Yes**  |                                                           |
| `definition`     | string | **Yes**  |                                                           |
| `timestamp`      | string | **Yes**  | ISO timestamp of the time when the worker was deployed    |

## hosts

A map of deployed workers

### Properties

| Property                               | Type                                            | Required | Description |
|----------------------------------------|-------------------------------------------------|----------|-------------|
| `Worker_deployed_using_direct_hosting` | [object](#worker_deployed_using_direct_hosting) | No       |             |

### Worker_deployed_using_direct_hosting

#### Properties

| Property              | Type                             | Required | Description                                            |
|-----------------------|----------------------------------|----------|--------------------------------------------------------|
| `definition`          | string                           | **Yes**  |                                                        |
| `installation_spells` | [object](#installation_spells)[] | **Yes**  | A list of installation spells                          |
| `relayId`             | string                           | **Yes**  |                                                        |
| `timestamp`           | string                           | **Yes**  | ISO timestamp of the time when the worker was deployed |

#### installation_spells

##### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `host_id`   | string | **Yes**  |             |
| `spell_id`  | string | **Yes**  |             |
| `worker_id` | string | **Yes**  |             |

