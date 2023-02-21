## fluence.yaml Type

`object` ([fluence.yaml](fluence.md))

# fluence.yaml Properties

| Property                              | Type     | Required | Nullable       | Defined by                                                                                                                     |
| :------------------------------------ | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| [services](#services)                 | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-services.md "https://fluence.dev/schemas/fluence.yaml#/properties/services")                 |
| [relays](#relays)                     | Merged   | Optional | can be null    | [fluence.yaml](fluence-properties-relays.md "https://fluence.dev/schemas/fluence.yaml#/properties/relays")                     |
| [peerIds](#peerids)                   | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-peer-ids.md "https://fluence.dev/schemas/fluence.yaml#/properties/peerIds")                  |
| [keyPairName](#keypairname)           | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-keypairname.md "https://fluence.dev/schemas/fluence.yaml#/properties/keyPairName")           |
| [version](#version)                   | `number` | Required | cannot be null | [fluence.yaml](fluence-properties-version.md "https://fluence.dev/schemas/fluence.yaml#/properties/version")                   |
| [dependencies](#dependencies)         | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies")         |
| [aquaInputPath](#aquainputpath)       | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-aquainputpath.md "https://fluence.dev/schemas/fluence.yaml#/properties/aquaInputPath")       |
| [aquaOutputTSPath](#aquaoutputtspath) | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-aquaoutputtspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/aquaOutputTSPath") |
| [aquaOutputJSPath](#aquaoutputjspath) | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-aquaoutputjspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/aquaOutputJSPath") |
| [appTSPath](#apptspath)               | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-apptspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/appTSPath")               |
| [appJSPath](#appjspath)               | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-appjspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/appJSPath")               |

## services

A map with service names as keys and Service configs as values. You can have any number of services listed here (According to JSON schema they are called 'additionalProperties') as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config

`services`

*   is optional

*   Type: `object` ([Services](fluence-properties-services.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services.md "https://fluence.dev/schemas/fluence.yaml#/properties/services")

### services Type

`object` ([Services](fluence-properties-services.md))

## relays

List of Fluence Peer multi addresses or a name of the network. This multi addresses are used for connecting to the Fluence network when deploying. Peer ids from these addresses are also used for deploying in case if you don't specify "peerId" or "peerIds" property in the deployment config. Default: kras

`relays`

*   is optional

*   Type: any of the following: `string` or `array` ([Relays](fluence-properties-relays.md))

*   can be null

*   defined in: [fluence.yaml](fluence-properties-relays.md "https://fluence.dev/schemas/fluence.yaml#/properties/relays")

### relays Type

any of the following: `string` or `array` ([Relays](fluence-properties-relays.md))

one (and only one) of

*   [Network name](fluence-properties-relays-oneof-network-name.md "check type definition")

*   [Multi addresses](fluence-properties-relays-oneof-multi-addresses.md "check type definition")

## peerIds

A map of named peerIds. Example:

MY\_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS

`peerIds`

*   is optional

*   Type: `object` ([Peer ids](fluence-properties-peer-ids.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-peer-ids.md "https://fluence.dev/schemas/fluence.yaml#/properties/peerIds")

### peerIds Type

`object` ([Peer ids](fluence-properties-peer-ids.md))

## keyPairName

The name of the Key Pair to use. It is resolved in the following order (from the lowest to the highest priority):

1.  "defaultKeyPairName" property from user-secrets.yaml
2.  "defaultKeyPairName" property from project-secrets.yaml
3.  "keyPairName" property from the top level of fluence.yaml
4.  "keyPairName" property from the "services" level of fluence.yaml
5.  "keyPairName" property from the individual "deploy" property item level of fluence.yaml

`keyPairName`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-keypairname.md "https://fluence.dev/schemas/fluence.yaml#/properties/keyPairName")

### keyPairName Type

`string`

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-version.md "https://fluence.dev/schemas/fluence.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
2
```

## dependencies

A map of dependency versions

`dependencies`

*   is optional

*   Type: `object` ([Dependencies](fluence-properties-dependencies.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies")

### dependencies Type

`object` ([Dependencies](fluence-properties-dependencies.md))

## aquaInputPath

Path to the aqua file or directory with aqua files that you want to compile by default

`aquaInputPath`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-aquainputpath.md "https://fluence.dev/schemas/fluence.yaml#/properties/aquaInputPath")

### aquaInputPath Type

`string`

## aquaOutputTSPath

Default compilation target dir from aqua to ts

`aquaOutputTSPath`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-aquaoutputtspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/aquaOutputTSPath")

### aquaOutputTSPath Type

`string`

## aquaOutputJSPath

Default compilation target dir from aqua to js. Overrides "aquaOutputTSPath" property

`aquaOutputJSPath`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-aquaoutputjspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/aquaOutputJSPath")

### aquaOutputJSPath Type

`string`

## appTSPath

Path to the directory where you want to generate app.ts after deployment. If you run registerApp() function in your typescript code after initializing FluenceJS client you will be able to access ids of the deployed services in aqua

`appTSPath`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-apptspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/appTSPath")

### appTSPath Type

`string`

## appJSPath

Path to the directory where you want to generate app.js after deployment. If you run registerApp() function in your javascript code after initializing FluenceJS client you will be able to access ids of the deployed services in aqua

`appJSPath`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-appjspath.md "https://fluence.dev/schemas/fluence.yaml#/properties/appJSPath")

### appJSPath Type

`string`
