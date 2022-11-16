## service.yaml Type

`object` ([service.yaml](service.md))

# service.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                   |
| :------------------ | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------- |
| [version](#version) | `number` | Required | cannot be null | [service.yaml](service-properties-version.md "https://fluence.dev/schemas/service.yaml#/properties/version") |
| [name](#name)       | `string` | Required | cannot be null | [service.yaml](service-properties-name.md "https://fluence.dev/schemas/service.yaml#/properties/name")       |
| [modules](#modules) | `object` | Required | cannot be null | [service.yaml](service-properties-modules.md "https://fluence.dev/schemas/service.yaml#/properties/modules") |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [service.yaml](service-properties-version.md "https://fluence.dev/schemas/service.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```

## name

Service name. Currently it is used for the service name only when you add service to fluence.yaml using "add" command. But this name can be overridden to any other with the --name flag or manually in fluence.yaml

`name`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [service.yaml](service-properties-name.md "https://fluence.dev/schemas/service.yaml#/properties/name")

### name Type

`string`

## modules

Service must have a facade module. Each module properties can be overridden by the same properties in the service config

`modules`

*   is required

*   Type: `object` ([Modules](service-properties-modules.md))

*   cannot be null

*   defined in: [service.yaml](service-properties-modules.md "https://fluence.dev/schemas/service.yaml#/properties/modules")

### modules Type

`object` ([Modules](service-properties-modules.md))
