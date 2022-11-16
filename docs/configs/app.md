## app.yaml Type

`object` ([app.yaml](app.md))

# app.yaml Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                           |
| :---------------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------- |
| [version](#version)     | `number` | Required | cannot be null | [app.yaml](app-properties-version.md "https://fluence.dev/schemas/app.yaml#/properties/version")     |
| [services](#services)   | `object` | Required | cannot be null | [app.yaml](app-properties-services.md "https://fluence.dev/schemas/app.yaml#/properties/services")   |
| [timestamp](#timestamp) | `string` | Required | cannot be null | [app.yaml](app-properties-timestamp.md "https://fluence.dev/schemas/app.yaml#/properties/timestamp") |
| [relays](#relays)       | Merged   | Optional | cannot be null | [app.yaml](app-properties-relays.md "https://fluence.dev/schemas/app.yaml#/properties/relays")       |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [app.yaml](app-properties-version.md "https://fluence.dev/schemas/app.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
3
```

## services

A map of the deployed services

`services`

*   is required

*   Type: `object` ([Services](app-properties-services.md))

*   cannot be null

*   defined in: [app.yaml](app-properties-services.md "https://fluence.dev/schemas/app.yaml#/properties/services")

### services Type

`object` ([Services](app-properties-services.md))

## timestamp

ISO timestamp of the time when the services were deployed

`timestamp`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [app.yaml](app-properties-timestamp.md "https://fluence.dev/schemas/app.yaml#/properties/timestamp")

### timestamp Type

`string`

## relays

Relays that you can connect to to find the peers where services are deployed

`relays`

*   is optional

*   Type: any of the folllowing: `string` or `array` ([Relays](app-properties-relays.md))

*   cannot be null

*   defined in: [app.yaml](app-properties-relays.md "https://fluence.dev/schemas/app.yaml#/properties/relays")

### relays Type

any of the folllowing: `string` or `array` ([Relays](app-properties-relays.md))

one (and only one) of

*   [Untitled string in app.yaml](app-properties-relays-oneof-0.md "check type definition")

*   [Multi addresses](app-properties-relays-oneof-multi-addresses.md "check type definition")
