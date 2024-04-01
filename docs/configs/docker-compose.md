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

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## volumes

| Property | Type | Required | Description |
|----------|------|----------|-------------|

