# workers.yaml

A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command

## Properties

| Property  | Type             | Required | Description               |
|-----------|------------------|----------|---------------------------|
| `version` | number           | **Yes**  |                           |
| `deals`   | [object](#deals) | No       | A map of created deals    |
| `hosts`   | [object](#hosts) | No       | A map of deployed workers |

## deals

A map of created deals

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## hosts

A map of deployed workers

| Property | Type | Required | Description |
|----------|------|----------|-------------|

