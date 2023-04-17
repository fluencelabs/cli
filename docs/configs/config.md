## config.yaml Type

`object` ([config.yaml](config.md))

# config.yaml Properties

| Property                                    | Type      | Required | Nullable       | Defined by                                                                                                                        |
| :------------------------------------------ | :-------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| [countlyConsent](#countlyconsent)           | `boolean` | Required | cannot be null | [config.yaml](config-properties-countlyconsent.md "https://fluence.dev/schemas/config.yaml#/properties/countlyConsent")           |
| [dependencies](#dependencies)               | `object`  | Optional | cannot be null | [config.yaml](config-properties-dependencies.md "https://fluence.dev/schemas/config.yaml#/properties/dependencies")               |
| [lastCheckForUpdates](#lastcheckforupdates) | `string`  | Optional | cannot be null | [config.yaml](config-properties-lastcheckforupdates.md "https://fluence.dev/schemas/config.yaml#/properties/lastCheckForUpdates") |
| [version](#version)                         | `number`  | Required | cannot be null | [config.yaml](config-properties-version.md "https://fluence.dev/schemas/config.yaml#/properties/version")                         |

## countlyConsent

Weather you consent to send usage data to Countly

`countlyConsent`

*   is required

*   Type: `boolean`

*   cannot be null

*   defined in: [config.yaml](config-properties-countlyconsent.md "https://fluence.dev/schemas/config.yaml#/properties/countlyConsent")

### countlyConsent Type

`boolean`

## dependencies

(For advanced users) Global overrides of dependencies

`dependencies`

*   is optional

*   Type: `object` ([Details](config-properties-dependencies.md))

*   cannot be null

*   defined in: [config.yaml](config-properties-dependencies.md "https://fluence.dev/schemas/config.yaml#/properties/dependencies")

### dependencies Type

`object` ([Details](config-properties-dependencies.md))

## lastCheckForUpdates

Last time when CLI checked for updates. Updates are checked daily unless this field is set to 'disabled'

`lastCheckForUpdates`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [config.yaml](config-properties-lastcheckforupdates.md "https://fluence.dev/schemas/config.yaml#/properties/lastCheckForUpdates")

### lastCheckForUpdates Type

`string`

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [config.yaml](config-properties-version.md "https://fluence.dev/schemas/config.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```
