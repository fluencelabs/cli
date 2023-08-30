# config.yaml

Defines global config for Fluence CLI

## Properties

| Property              | Type                    | Required | Description                                                                                                      |
|-----------------------|-------------------------|----------|------------------------------------------------------------------------------------------------------------------|
| `countlyConsent`      | boolean                 | **Yes**  | Weather you consent to send usage data to Countly                                                                |
| `version`             | number                  | **Yes**  |                                                                                                                  |
| `dependencies`        | [object](#dependencies) | No       | (For advanced users) Global overrides of dependencies                                                            |
| `docsInConfigs`       | boolean                 | No       | Whether to include commented-out documented config examples in the configs generated with the CLI                |
| `lastCheckForUpdates` | string                  | No       | Last time when Fluence CLI checked for updates. Updates are checked daily unless this field is set to 'disabled' |

## dependencies

(For advanced users) Global overrides of dependencies

### Properties

| Property | Type             | Required | Description                     |
|----------|------------------|----------|---------------------------------|
| `cargo`  | [object](#cargo) | No       | Overrides of cargo dependencies |
| `npm`    | [object](#npm)   | No       | Overrides of npm dependencies   |

### cargo

Overrides of cargo dependencies

#### Properties

| Property                | Type   | Required | Description              |
|-------------------------|--------|----------|--------------------------|
| `Cargo_dependency_name` | string | No       | cargo dependency version |

### npm

Overrides of npm dependencies

#### Properties

| Property              | Type   | Required | Description            |
|-----------------------|--------|----------|------------------------|
| `npm_dependency_name` | string | No       | npm dependency version |

