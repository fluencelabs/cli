# config.yaml

Defines global config for Fluence CLI

## Properties

| Property              | Type                    | Required | Description                                                                                              |
|-----------------------|-------------------------|----------|----------------------------------------------------------------------------------------------------------|
| `countlyConsent`      | boolean                 | **Yes**  | Weather you consent to send usage data to Countly                                                        |
| `version`             | number                  | **Yes**  |                                                                                                          |
| `dependencies`        | [object](#dependencies) | No       | (For advanced users) Global overrides of dependencies                                                    |
| `lastCheckForUpdates` | string                  | No       | Last time when CLI checked for updates. Updates are checked daily unless this field is set to 'disabled' |

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

| Property                | Type   | Required | Description |
|-------------------------|--------|----------|-------------|
| `cargo-dependency-name` | string | No       |             |

### npm

Overrides of npm dependencies

#### Properties

| Property              | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| `npm-dependency-name` | string | No       |             |

