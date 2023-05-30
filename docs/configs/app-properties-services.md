## services Type

`object` ([Services](app-properties-services.md))

# services Properties

| Property              | Type     | Required | Nullable       | Defined by                                                                                                                                 |
| :-------------------- | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| Additional Properties | `object` | Optional | cannot be null | [app.yaml](app-properties-services-deployment-results.md "https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties") |

## Additional Properties

Additional properties are allowed, as long as they follow this schema:

Service names as keys and deployment results as values

*   is optional

*   Type: `object` ([Deployment results](app-properties-services-deployment-results.md))

*   cannot be null

*   defined in: [app.yaml](app-properties-services-deployment-results.md "https://fluence.dev/schemas/app.yaml#/properties/services/additionalProperties")

### additionalProperties Type

`object` ([Deployment results](app-properties-services-deployment-results.md))
