# Fluence CLI Configs

## [fluence.yaml](./fluence.md)

Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use `Fluence CLI init` command to generate a template for new Fluence project
## [module.yaml](./module.md)

Defines [Marine Module](https://fluence.dev/docs/build/concepts/#modules). You can use `Fluence CLI module new` command to generate a template for new module
## [service.yaml](./service.md)

Defines a [Marine service](https://fluence.dev/docs/build/concepts/#services), most importantly the modules that the service consists of. You can use `Fluence CLI service new` command to generate a template for new service
## [spell.yaml](./spell.md)

Defines a spell. You can use `Fluence CLI spell new` command to generate a template for new spell
## [workers.yaml](./workers.md)

A result of app deployment. This file is created automatically after successful deployment using `Fluence CLI workers deploy` command
## [project-secrets.yaml](./project-secrets.md)

Defines project's secret keys that are used only in the scope of this particular Fluence project. You can manage project's keys using commands from `Fluence CLI key` group of commands
## [user-secrets.yaml](./user-secrets.md)

Defines user's secret keys that can be used across different Fluence projects. You can manage user's keys using commands from `Fluence CLI key` group of commands with `--user` flag
## [config.yaml](./config.md)

Defines global config for Fluence CLI
