## additionalProperties Type

`object` ([Service config](fluence-properties-services-service-config.md))

# additionalProperties Properties

| Property                            | Type     | Required | Nullable       | Defined by                                                                                                                                                                                         |
| :---------------------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [get](#get)                         | `string` | Required | cannot be null | [fluence.yaml](fluence-properties-services-service-config-properties-get.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/get")                   |
| [overrideModules](#overridemodules) | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-services-service-config-properties-overrides.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/overrideModules") |
| [deploy](#deploy)                   | `array`  | Optional | cannot be null | [fluence.yaml](fluence-properties-services-service-config-properties-deployment-list.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy")    |
| [keyPairName](#keypairname)         | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-services-service-config-properties-keypairname.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/keyPairName")   |

## get

Path to service directory or URL to the tar.gz archive with the service

`get`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-service-config-properties-get.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/get")

### get Type

`string`

## overrideModules

A map of modules to override

`overrideModules`

*   is optional

*   Type: `object` ([Overrides](fluence-properties-services-service-config-properties-overrides.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-service-config-properties-overrides.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/overrideModules")

### overrideModules Type

`object` ([Overrides](fluence-properties-services-service-config-properties-overrides.md))

## deploy

List of deployments for the particular service

`deploy`

*   is optional

*   Type: `object[]` ([Deployment](fluence-properties-services-service-config-properties-deployment-list-deployment.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-service-config-properties-deployment-list.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy")

### deploy Type

`object[]` ([Deployment](fluence-properties-services-service-config-properties-deployment-list-deployment.md))

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

*   defined in: [fluence.yaml](fluence-properties-services-service-config-properties-keypairname.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/keyPairName")

### keyPairName Type

`string`
