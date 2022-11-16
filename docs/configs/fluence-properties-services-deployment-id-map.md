## additionalProperties Type

`object` ([Deployment id map](fluence-properties-services-deployment-id-map.md))

# additionalProperties Properties

| Property                    | Type     | Required | Nullable       | Defined by                                                                                                                                                                                          |
| :-------------------------- | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [get](#get)                 | `string` | Required | cannot be null | [fluence.yaml](fluence-properties-services-deployment-id-map-properties-get.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/get")                 |
| [deploy](#deploy)           | `array`  | Required | cannot be null | [fluence.yaml](fluence-properties-services-deployment-id-map-properties-deployment-list.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy")  |
| [keyPairName](#keypairname) | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-services-deployment-id-map-properties-keypairname.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/keyPairName") |

## get

Path to service directory or URL to the tar.gz archive with the service

`get`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-deployment-id-map-properties-get.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/get")

### get Type

`string`

## deploy

List of deployments for the particular service

`deploy`

*   is required

*   Type: `object[]` ([Deployment](fluence-properties-services-deployment-id-map-properties-deployment-list-deployment.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-deployment-id-map-properties-deployment-list.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/deploy")

### deploy Type

`object[]` ([Deployment](fluence-properties-services-deployment-id-map-properties-deployment-list-deployment.md))

## keyPairName

The Key Pair that will be used for the deployment. It is resolved in the following order (from the lowest to the highest priority):

1.  "defaultKeyPairName" property from user-secrets.yaml
2.  "defaultKeyPairName" property from project-secrets.yaml
3.  "keyPairName" property from the top level of fluence.yaml
4.  "keyPairName" property from the "services" level of fluence.yaml
5.  "keyPairName" property from the individual "deploy" property item level of fluence.yaml

`keyPairName`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-deployment-id-map-properties-keypairname.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties/properties/keyPairName")

### keyPairName Type

`string`
