# Compose Specification

The Compose file is a YAML file defining a multi-containers based application.

## Properties

| Property   | Type                | Required | Description                                                         |
|------------|---------------------|----------|---------------------------------------------------------------------|
| `configs`  | [object](#configs)  | No       |                                                                     |
| `include`  |                     | No       | compose sub-projects to be included.                                |
| `name`     | string              | No       | define the Compose project name, until user defines one explicitly. |
| `networks` | [object](#networks) | No       |                                                                     |
| `secrets`  | [object](#secrets)  | No       |                                                                     |
| `services` | [object](#services) | No       |                                                                     |
| `version`  | string              | No       | declared for backward compatibility, ignored.                       |
| `volumes`  | [object](#volumes)  | No       |                                                                     |

## configs

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## networks

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## secrets

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## services

### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `service` | [object](#service) | No       |             |

### service

#### Properties

| Property      | Type                           | Required | Description |
|---------------|--------------------------------|----------|-------------|
| `command`     | array or string                | No       |             |
| `depends_on`  | array or [object](#depends_on) | No       |             |
| `environment` | [object](#environment)         | No       |             |
| `healthcheck` | [object](#healthcheck)         | No       |             |
| `image`       | string                         | No       |             |
| `ports`       | string[]                       | No       |             |
| `pull_policy` | string                         | No       |             |
| `secrets`     | string[]                       | No       |             |
| `volumes`     | string[]                       | No       |             |

#### depends_on

| Property | Type | Required | Description |
|----------|------|----------|-------------|

#### environment

| Property | Type | Required | Description |
|----------|------|----------|-------------|

#### healthcheck

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## volumes

| Property | Type | Required | Description |
|----------|------|----------|-------------|

