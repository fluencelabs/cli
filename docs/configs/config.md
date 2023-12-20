# config.yaml

Defines global config for Fluence CLI

## Properties

| Property               | Type                    | Required | Description                                                                                                                                                                                                                                                                         |
|------------------------|-------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `countlyConsent`       | boolean                 | **Yes**  | Weather you consent to send usage data to Countly                                                                                                                                                                                                                                   |
| `defaultSecretKeyName` | string                  | **Yes**  | Secret key with this name will be used by default by js-client inside CLI to run Aqua code                                                                                                                                                                                          |
| `version`              | number                  | **Yes**  |                                                                                                                                                                                                                                                                                     |
| `dependencies`         | [object](#dependencies) | No       | DEPRECATED: You can install dependencies only per-project. (For advanced users) Global overrides of dependencies                                                                                                                                                                    |
| `docsInConfigs`        | boolean                 | No       | Whether to include commented-out documented config examples in the configs generated with the CLI                                                                                                                                                                                   |
| `lastCheckForUpdates`  | string                  | No       | DEPRECATED. It's currently advised to install CLI without using npm (See README.md: https://github.com/fluencelabs/cli?tab=readme-ov-file#installation-and-usage). Last time when Fluence CLI checked for updates. Updates are checked daily unless this field is set to 'disabled' |

## dependencies

DEPRECATED: You can install dependencies only per-project. (For advanced users) Global overrides of dependencies

### Properties

| Property | Type             | Required | Description                                                                                |
|----------|------------------|----------|--------------------------------------------------------------------------------------------|
| `cargo`  | [object](#cargo) | No       | DEPRECATED: You can install dependencies only per-project. Overrides of cargo dependencies |
| `npm`    | [object](#npm)   | No       | DEPRECATED: You can install dependencies only per-project. Overrides of npm dependencies   |

### cargo

DEPRECATED: You can install dependencies only per-project. Overrides of cargo dependencies

#### Properties

| Property                | Type   | Required | Description              |
|-------------------------|--------|----------|--------------------------|
| `Cargo_dependency_name` | string | No       | cargo dependency version |

### npm

DEPRECATED: You can install dependencies only per-project. Overrides of npm dependencies

#### Properties

| Property              | Type   | Required | Description            |
|-----------------------|--------|----------|------------------------|
| `npm_dependency_name` | string | No       | npm dependency version |

