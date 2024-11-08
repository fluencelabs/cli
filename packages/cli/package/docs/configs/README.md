# Fluence CLI Configs

## [fluence.yaml](./fluence.md)

Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use `fluence init` command to generate a template for new Fluence project

## [provider.yaml](./provider.md)

Defines config used for provider set up

## [provider-secrets.yaml](./provider-secrets.md)

Defines secrets config used for provider set up

## [module.yaml](./module.md)

Defines Marine Module. You can use `fluence module new` command to generate a template for new module

## [service.yaml](./service.md)

Defines a [Marine service](https://fluence.dev/docs/build/concepts/#services), most importantly the modules that the service consists of. You can use `fluence service new` command to generate a template for new service

## [spell.yaml](./spell.md)

Defines a spell. You can use `fluence spell new` command to generate a template for new spell

## [workers.yaml](./workers.md)

A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command

## [config.yaml](./config.md)

Defines global config for Fluence CLI

## [env.yaml](./env.md)

Defines project user's preferences

## [provider-artifacts.yaml](./provider-artifacts.md)

Defines artifacts created by the provider