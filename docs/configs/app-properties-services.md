## services Type

`object` ([Services](app-properties-services.md))

# services Properties

| Property              | Type     | Required | Nullable       | Defined by                                                                                                                             |
| :-------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| Additional Properties | `object` | Optional | cannot be null | [app.yaml](app-properties-services-deployment-ids.md "https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties") |

## Additional Properties

Additional properties are allowed, as long as they follow this schema:

A map of the deployment ids of the deployed services

*   is optional

*   Type: `object` ([Deployment ids](app-properties-services-deployment-ids.md))

*   cannot be null

*   defined in: [app.yaml](app-properties-services-deployment-ids.md "https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties")

### additionalProperties Type

`object` ([Deployment ids](app-properties-services-deployment-ids.md))
