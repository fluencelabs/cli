# Fluence CLI

Fluence is a decentralized serverless platform & computing marketplace powered
by blockchain economics. Fluence is a global, permissionless, scalable, and
secure alternative to centralized cloud computing platforms.

Fluence CLI is designed to be the only tool that you need to manage the life
cycle of applications written on [Fluence](https://fluence.network). It provides
project scaffolding, compilation, service deployment, dependency management and
installation, storage of keys and ids, etc.

## CLI installation

### Windows

To download and install `fluence` use Windows `.exe` installer from the [release](https://github.com/fluencelabs/cli/releases) page.

### Linux and macOS

To download and install `fluence` use our `install.sh` script

```shell
curl -qsL https://raw.githubusercontent.com/fluencelabs/cli/main/install.sh | bash
```

**Installing manually**

-   download fluence archive for your platform from
    [latest release](https://github.com/fluencelabs/cli/releases/latest).
-   extract archive contents to default fluence user directory

    ```shell
    tar --strip-components=1 -xzf <archive> -C "${HOME}/.fluence/cli"
    ```

-   add `${HOME}/.fluence/cli/bin` to `$PATH`

### Update

To select `fluence` version compatible with certain network (`stage`, `testnet`, `mainnet`) run:

```shell
fluence update <network>
```

You will receive notifications about updates when new version is promoted.

For more information run:

```shell
fluence update --help
```

## Uninstall CLI

**Windows**

Go to installation directory and run `Uninstall.exe` binary.

**Linux and macOS**

To uninstall CLI you need to remove couple of directories

```sh
rm -rf ~/.fluence
rm -rf ~/.local/share/fluence
```

You can also remove `${HOME}/.fluence/cli/bin` from `$PATH` e.g. like that:

```sh
rm $(which fluence)
```

## Documentation

1. [A complete list of commands together with usage examples](./packages/cli/cli/docs/commands/README.md)
1. [Documentation for all Fluence CLI configs](./packages/cli/cli/docs/configs/README.md)
1. [Environment variables that affect Fluence CLI and are important for Fluence CLI maintainers](./packages/cli/cli/example.env)

## Support

Please, file an [issue](https://github.com/fluencelabs/cli/issues) if you find a
bug. You can also contact us at [Discord](https://discord.com/invite/5qSnPZKh7u)
or [Telegram](https://t.me/fluence_project). We will do our best to resolve the
issue ASAP.

## Contributing

Any interested person is welcome to contribute to the project. Please, make sure
you read and follow some basic [rules](./CONTRIBUTING.md).

## License

All software code is copyright (c) Fluence Labs, Inc. under the
[GNU Affero General Public License version 3](./LICENSE) license.
