# docker-compose.yaml

Defines a multi-containers based application.

## Properties

| Property   | Type                | Required | Description |
|------------|---------------------|----------|-------------|
| `services` | [object](#services) | **Yes**  |             |
| `version`  | string              | **Yes**  |             |
| `include`  | string[]            | No       |             |
| `secrets`  | [object](#secrets)  | No       |             |

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

| Property      | Type                   | Required | Description |
|---------------|------------------------|----------|-------------|
| `command`     | string[]               | No       |             |
| `depends_on`  | string[]               | No       |             |
| `environment` | [object](#environment) | No       |             |
| `image`       | string                 | No       |             |
| `ports`       | string[]               | No       |             |
| `pull_policy` | string                 | No       |             |
| `secrets`     | string[]               | No       |             |
| `volumes`     | string[]               | No       |             |

#### environment

| Property | Type | Required | Description |
|----------|------|----------|-------------|

