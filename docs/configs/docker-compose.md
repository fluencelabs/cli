# docker-compose.yaml

Defines a multi-containers based application.

## Properties

| Property   | Type                | Required | Description |
|------------|---------------------|----------|-------------|
| `services` | [object](#services) | **Yes**  |             |
| `version`  | string              | **Yes**  |             |
| `include`  | string[]            | No       |             |
| `secrets`  | [object](#secrets)  | No       |             |
| `volumes`  | [object](#volumes)  | No       |             |

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

