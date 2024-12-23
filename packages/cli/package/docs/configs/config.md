# config.yaml

Defines global config for Fluence CLI

## Properties

| Property               | Type    | Required | Description                                                                                            |
|------------------------|---------|----------|--------------------------------------------------------------------------------------------------------|
| `countlyConsent`       | boolean | **Yes**  | Weather you consent to send usage data to Countly                                                      |
| `version`              | integer | **Yes**  | Config version                                                                                         |
| `defaultSecretKeyName` | string  | No       | DEPRECATED: Secret key with this name will be used by default by js-client inside CLI to run Aqua code |
| `docsInConfigs`        | boolean | No       | DEPRECATED: Whether to include docs in generated configs                                               |

