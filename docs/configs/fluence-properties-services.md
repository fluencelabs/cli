## services Type

`object` ([Services](fluence-properties-services.md))

# services Properties

| Property              | Type     | Required | Nullable       | Defined by                                                                                                                                         |
| :-------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additional Properties | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-services-service-config.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties") |

## Additional Properties

Additional properties are allowed, as long as they follow this schema:

Service names as keys (must start with a lowercase letter and contain only letters numbers and underscores) and Service config (defines where the service is and how to deploy it) as values

*   is optional

*   Type: `object` ([Service config](fluence-properties-services-service-config.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-services-service-config.md "https://fluence.dev/schemas/fluence.yaml#/properties/services/additionalProperties")

### additionalProperties Type

`object` ([Service config](fluence-properties-services-service-config.md))
