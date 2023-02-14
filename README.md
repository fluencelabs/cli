# Fluence CLI

Fluence is a decentralized serverless platform & computing marketplace powered by blockchain economics. Fluence is a global, permissionless, scalable, and secure alternative to centralized cloud computing platforms.

Previously Fluence developers used [aqua](https://fluence.dev/docs/aqua-book/aqua-cli/), [marine](https://fluence.dev/docs/marine-book/marine-tooling-reference/marine-cli) and [mrepl](https://fluence.dev/docs/marine-book/marine-tooling-reference/marine-repl) command line tools to develop applications, and now we have combined them in the single tool. Older tools still can be used for local-development, but the new serverless approach requires fluence-cli.

Fluence CLI is designed to be the only tool that you need to manage the life cycle of applications written on [Fluence](https://fluence.network). It provides project scaffolding, compilation, service deployment, dependency management and installation, storage of keys and ids, etc.

With this release we are rolling out the functionality related to the serverless with the following limitations:
 - you can only deploy to nodes that are provided by Fluence Labs (later it will be possible to deploy to the nodes that are provided by various compute providers)
 - you will be able to create deals using FakeUSD tokens that can be acquired though the token facet service for Free. They will be delivered to your Aurora wallet ID
 - Fluence-cli takes care of installing all the external dependencies. You will only need to install node 16 and Metamask for the on-chain functionality to work
 

The Serverless flow:
- Scaffold the project from one of the templates
- Develop the app
  - Develop new Marine Service
  - Add Marine Service from external source
  - Test the app locally?
- Deploy the app
- Create the deal

- Hosting vs. Serverless 
  - references for old aqua related tools (new flow vs old flow)
  - references for old marine tools (marine -> fluence build)
  - explanation how the on-chain part works (the serverless flow)
  - limitations
    - nodes == fluence nodes (Kras)
    - tokens and token facets (how to get going)
    - required external tooling (metamask, node versions, etc)


- rust + wasi versions (always for the latest)
- nvm intallation and re-activation on every run


- some happy path (fluence decentralized gateway)
- compatibility with web3 SDKs (ethos.js / web3.js) - how to use existing DAPPS with our gateway

- Compatible examples and projects

- Scaffolding strucuture (what written where, and where to edit what)
- How to update the aqua compiler and update the tools
- YAML files and directory structure
  - configs for workers

- flag incompatibility /w aqua & fluence

-! Bump CLI version with all the tooling (aqua)

## Installation and Usage

Prerequisites:

- Linux or MacOS (there are currently some bugs on Windows)
- [Node.js = 16.x.x](https://nodejs.org/)

### Install flurnce-cli
```sh-session
npm install -g @fluencelabs/cli
```

### Get Fluence USD from Token Faucet
Got to [Fluence Faucet](https://faucet.fluence.dev) and claim your free Fluence USD tokens.



## Documentation

A complete list of commands together with usage examples is available [here](./docs/commands/README.md) with a detailed workflow [example](./docs/EXAMPLE.md). Documentation for all configs that Fluence CLI uses can be found [here](./docs/configs/README.md).

## Support

Please, file an [issue](https://github.com/fluencelabs/fluence-cli/issues) if you find a bug. You can also contact us at [Discord](https://discord.com/invite/5qSnPZKh7u) or [Telegram](https://t.me/fluence_project).  We will do our best to resolve the issue ASAP.


## Contributing

Any interested person is welcome to contribute to the project. Please, make sure you read and follow some basic [rules](./CONTRIBUTING.md).


## License

All software code is copyright (c) Fluence Labs, Inc. under the [Apache-2.0](./LICENSE) license.

