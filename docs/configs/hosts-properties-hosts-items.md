## items Type

`object` ([Details](hosts-properties-hosts-items.md))

# items Properties

| Property                  | Type     | Required | Nullable       | Defined by                                                                                                                                                 |
| :------------------------ | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [workerName](#workername) | `string` | Required | cannot be null | [hosts.yaml](hosts-properties-hosts-items-properties-workername.md "https://fluence.dev/schemas/hosts.yaml#/properties/hosts/items/properties/workerName") |
| [peerIds](#peerids)       | `array`  | Required | cannot be null | [hosts.yaml](hosts-properties-hosts-items-properties-peerids.md "https://fluence.dev/schemas/hosts.yaml#/properties/hosts/items/properties/peerIds")       |

## workerName

Name of the worker to host. The same as in workers.yaml

`workerName`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [hosts.yaml](hosts-properties-hosts-items-properties-workername.md "https://fluence.dev/schemas/hosts.yaml#/properties/hosts/items/properties/workerName")

### workerName Type

`string`

## peerIds

An array of peer IDs to deploy on

`peerIds`

*   is required

*   Type: `string[]`

*   cannot be null

*   defined in: [hosts.yaml](hosts-properties-hosts-items-properties-peerids.md "https://fluence.dev/schemas/hosts.yaml#/properties/hosts/items/properties/peerIds")

### peerIds Type

`string[]`
