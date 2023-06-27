# Changelog

## [0.4.18](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.17...fluence-cli-v0.4.18) (2023-06-26)


### Features

* add air beautify [fixes DXJ-386] ([#303](https://github.com/fluencelabs/fluence-cli/issues/303)) ([8d91b33](https://github.com/fluencelabs/fluence-cli/commit/8d91b33676a11e426c222d15af2a284057919ee5))
* automatically add spell to fluence.yaml upon creation [fixes DXJ-395] ([#304](https://github.com/fluencelabs/fluence-cli/issues/304)) ([22609ea](https://github.com/fluencelabs/fluence-cli/commit/22609ea2a6fa1d505f0397286d7312531f3b0bdd))

## [0.4.17](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.16...fluence-cli-v0.4.17) (2023-06-16)


### Features

* add tracing for aqua [fixes DXJ-392] ([#290](https://github.com/fluencelabs/fluence-cli/issues/290)) ([865879b](https://github.com/fluencelabs/fluence-cli/commit/865879beccb93a3aca354cda4ce78c4dabb1b441))


### Bug Fixes

* fix init and docs [fixes DXJ-342] ([#294](https://github.com/fluencelabs/fluence-cli/issues/294)) ([eb99d9f](https://github.com/fluencelabs/fluence-cli/commit/eb99d9f77e223075d04ac20bd5efe4e9945f0a6d))

## [0.4.16](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.15...fluence-cli-v0.4.16) (2023-06-15)


### Bug Fixes

* fix aqua compilation ([ef9128b](https://github.com/fluencelabs/fluence-cli/commit/ef9128b62a441b01e4786aac2323307e1cfee31a))
* fix aqua compilation flags ([#292](https://github.com/fluencelabs/fluence-cli/issues/292)) ([ef9128b](https://github.com/fluencelabs/fluence-cli/commit/ef9128b62a441b01e4786aac2323307e1cfee31a))

## [0.4.15](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.14...fluence-cli-v0.4.15) (2023-06-15)


### Features

* ask names instead of path for new services, modules and spells [fixes DXJ-385] ([#287](https://github.com/fluencelabs/fluence-cli/issues/287)) ([21f4ba2](https://github.com/fluencelabs/fluence-cli/commit/21f4ba230037a9b6c33c7b373cf2131e1b9e202c))
* auto-commit ([#263](https://github.com/fluencelabs/fluence-cli/issues/263)) ([1221d0f](https://github.com/fluencelabs/fluence-cli/commit/1221d0fee6f83c818d616770e954e63463d418da))
* deal deploy e2e [fixes DXJ-379] ([#276](https://github.com/fluencelabs/fluence-cli/issues/276)) ([4fe7579](https://github.com/fluencelabs/fluence-cli/commit/4fe7579420162260d26f005f1b26b7a712c20017))
* **docs:** new config docs [fixes DXJ-168] ([#278](https://github.com/fluencelabs/fluence-cli/issues/278)) ([5325e86](https://github.com/fluencelabs/fluence-cli/commit/5325e86246ca0ac083820c0f8f51df98b59d5ec3))
* **ipfs:** add dag upload [fixes DXJ-390] ([#288](https://github.com/fluencelabs/fluence-cli/issues/288)) ([47755de](https://github.com/fluencelabs/fluence-cli/commit/47755de155686afcb2401df167e774d591b6afaf))
* migrate to NodeJS version 18 [fixes DXJ-384] ([#286](https://github.com/fluencelabs/fluence-cli/issues/286)) ([659f00f](https://github.com/fluencelabs/fluence-cli/commit/659f00f30eed9c6d1106839c45408aef8f6494ee))
* remove aqua cli dependency and legacy deploy [fixes DXJ-391] ([#283](https://github.com/fluencelabs/fluence-cli/issues/283)) ([7536772](https://github.com/fluencelabs/fluence-cli/commit/753677270e74d8fc070b16f6c3bf65468a87fd68))
* update deployed workers structure in aqua to use optional values [fixes DXJ-382] ([#279](https://github.com/fluencelabs/fluence-cli/issues/279)) ([377fd86](https://github.com/fluencelabs/fluence-cli/commit/377fd862dceb19dc9014728563d742bb34f52451))


### Bug Fixes

* aqua compilation hanging with Countly on ([#274](https://github.com/fluencelabs/fluence-cli/issues/274)) ([84c33a2](https://github.com/fluencelabs/fluence-cli/commit/84c33a2bf49def8f0e8c55406545570f4c8cbc88))
* set bool flags as false by default ([#289](https://github.com/fluencelabs/fluence-cli/issues/289)) ([99bb8a6](https://github.com/fluencelabs/fluence-cli/commit/99bb8a67715811acbc477dd8f25438f73f61a081))

## [0.4.14](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.13...fluence-cli-v0.4.14) (2023-05-29)


### Features

* **deps:** Update "spell" version in versions.json ([#270](https://github.com/fluencelabs/fluence-cli/issues/270)) ([39a82d0](https://github.com/fluencelabs/fluence-cli/commit/39a82d04471ab58df68c70ee99c7c5132482372f))
* **deps:** update installation-spell version to 0.5.13 ([#272](https://github.com/fluencelabs/fluence-cli/issues/272)) ([70c89e0](https://github.com/fluencelabs/fluence-cli/commit/70c89e0bea20dece74a6813a31e127032b0c5589))

## [0.4.13](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.12...fluence-cli-v0.4.13) (2023-05-28)


### Features

* Update versions.json with new registry version ([ee4e548](https://github.com/fluencelabs/fluence-cli/commit/ee4e548ec1cf31f409fd5a0b3ffb1e5502f6d8bb))

## [0.4.12](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.11...fluence-cli-v0.4.12) (2023-05-22)


### Features

* **installation-spell:** bump to 0.5.12 ([#262](https://github.com/fluencelabs/fluence-cli/issues/262)) ([621f9de](https://github.com/fluencelabs/fluence-cli/commit/621f9de7ccd222c50e0413292632d23f26392678))

## [0.4.11](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.10...fluence-cli-v0.4.11) (2023-05-17)


### Bug Fixes

* don't auto-pin global dependencies [fixes DXJ-380] ([#257](https://github.com/fluencelabs/fluence-cli/issues/257)) ([237e1bb](https://github.com/fluencelabs/fluence-cli/commit/237e1bbb8781bf6b25d4d22f956c86224b51f02d))
* don't print undefined for `run` [fixes DXJ-377] ([#258](https://github.com/fluencelabs/fluence-cli/issues/258)) ([7afe968](https://github.com/fluencelabs/fluence-cli/commit/7afe9681c03cdf41191576abdd9fcdf73455ba87))
* pin @fluencelabs/deal-aurora version ([#260](https://github.com/fluencelabs/fluence-cli/issues/260)) ([68710e6](https://github.com/fluencelabs/fluence-cli/commit/68710e6c46899483676312879ac5bd57d874f416))

## [0.4.10](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.9...fluence-cli-v0.4.10) (2023-05-08)


### Bug Fixes

* fix deal-aurora import ([#255](https://github.com/fluencelabs/fluence-cli/issues/255)) ([4b85a52](https://github.com/fluencelabs/fluence-cli/commit/4b85a52945db7b4ca3a6373b5c0e3c020cd20614))

## [0.4.9](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.8...fluence-cli-v0.4.9) (2023-05-08)


### Features

* add cliVersion property and check for updates [fixes DXJ-358 DXJ-363] ([#242](https://github.com/fluencelabs/fluence-cli/issues/242)) ([add7abd](https://github.com/fluencelabs/fluence-cli/commit/add7abdadb2c2045e0464b2b9c80ff1675d7f977))
* allow aliasing of peers, so you can use kras-00 instead of actual peerId or relay address. Init js-client only after validation is done ([#253](https://github.com/fluencelabs/fluence-cli/issues/253)) ([49585f6](https://github.com/fluencelabs/fluence-cli/commit/49585f6779c4d82e7d16f513b86012e34d0c7d2f))
* easier debugging with arrow-body-style lint rule ([#245](https://github.com/fluencelabs/fluence-cli/issues/245)) ([9279f04](https://github.com/fluencelabs/fluence-cli/commit/9279f04a1c71698e608e757dc3b0a3b7ae5e0265))
* no-build flag [fixes DXJ-368] ([#244](https://github.com/fluencelabs/fluence-cli/issues/244)) ([f6bcc1b](https://github.com/fluencelabs/fluence-cli/commit/f6bcc1b04568317b5ce22480e79d7438bcbf6922))
* support .yml extension for configs [fixes DXJ-350] ([#248](https://github.com/fluencelabs/fluence-cli/issues/248)) ([fefd5fc](https://github.com/fluencelabs/fluence-cli/commit/fefd5fcfab7af616f955fc676cfed12b7271a469))
* **tests:** add workers deploy test, turn off ipfs logs visible by default [fixes DXJ-369] ([#247](https://github.com/fluencelabs/fluence-cli/issues/247)) ([ed63112](https://github.com/fluencelabs/fluence-cli/commit/ed631124fd5e258d289f4f9dec9333bdd6b0b28c))


### Bug Fixes

* check dependencies in fluence.yaml first when warning about dependency overrides ([#251](https://github.com/fluencelabs/fluence-cli/issues/251)) ([e4c9f9d](https://github.com/fluencelabs/fluence-cli/commit/e4c9f9d470b0be986355993baad63683ff59eadb))
* **deps:** update dependency filenamify to v6 ([#250](https://github.com/fluencelabs/fluence-cli/issues/250)) ([b46a472](https://github.com/fluencelabs/fluence-cli/commit/b46a4723a2f0cfcc0a351123c46ed74350c5394d))
* **spell:** update installation-spell to 0.5.11 ([4749c48](https://github.com/fluencelabs/fluence-cli/commit/4749c480ff6041f275cb236ae32741e90b8241ce))
* **spell:** update installation-spell to 0.5.11 ([#254](https://github.com/fluencelabs/fluence-cli/issues/254)) ([b1ef46e](https://github.com/fluencelabs/fluence-cli/commit/b1ef46e2bc68a80e886d78af2ef3cd0b08cc0e1b))

## [0.4.8](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.7...fluence-cli-v0.4.8) (2023-04-14)


### Features

* add -g flag for global dependency management and warn about using dependency overrides [fixes DXJ-362 DXJ-329] ([#238](https://github.com/fluencelabs/fluence-cli/issues/238)) ([31227b7](https://github.com/fluencelabs/fluence-cli/commit/31227b76655ab7c258e155a2d53addfb0acc7fac))

## [0.4.7](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.6...fluence-cli-v0.4.7) (2023-04-13)


### Features

* improve jsToAqua so numbers can be u64, i64 and f64 ([#239](https://github.com/fluencelabs/fluence-cli/issues/239)) ([e9dbf54](https://github.com/fluencelabs/fluence-cli/commit/e9dbf54759f2adc945bba6f68406fabf9edad2df))

## [0.4.6](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.5...fluence-cli-v0.4.6) (2023-04-12)


### Features

* **aqua:** ensure default imports when initing the project [fixes DXJ-365] ([#236](https://github.com/fluencelabs/fluence-cli/issues/236)) ([e3ab6a3](https://github.com/fluencelabs/fluence-cli/commit/e3ab6a3cc9fcd92ab0b712aaf2930cc1aa598e13))
* move contracts to aurora testnet ([#237](https://github.com/fluencelabs/fluence-cli/issues/237)) ([f548ef7](https://github.com/fluencelabs/fluence-cli/commit/f548ef710115fa07c03662b244e6f24dac700bd8))
* mv contracts to aurora testnet ([f548ef7](https://github.com/fluencelabs/fluence-cli/commit/f548ef710115fa07c03662b244e6f24dac700bd8))
* update dependencies ([#234](https://github.com/fluencelabs/fluence-cli/issues/234)) ([50466f8](https://github.com/fluencelabs/fluence-cli/commit/50466f813c2d88a3ff9f7d606e0e5b8eda395e12))

## [0.4.5](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.4...fluence-cli-v0.4.5) (2023-04-11)


### Features

* remove fluence-lock.yaml, simplify dependency management, use versions.json [fixes DXJ-120 DXJ-265 DXJ-284 DXJ-359 DXJ-361] ([#232](https://github.com/fluencelabs/fluence-cli/issues/232)) ([82a7413](https://github.com/fluencelabs/fluence-cli/commit/82a74137e336204d501fb7b3640efeda6ac440b2))

## [0.4.4](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.3...fluence-cli-v0.4.4) (2023-04-10)


### Features

* add versions.json ([#228](https://github.com/fluencelabs/fluence-cli/issues/228)) ([db15cc1](https://github.com/fluencelabs/fluence-cli/commit/db15cc1e71a27a69495295c3e3602c7ba23811fe))


### Bug Fixes

* **spell:** @fluencelabs/installation-spell 0.5.9 ([#230](https://github.com/fluencelabs/fluence-cli/issues/230)) ([7872b0e](https://github.com/fluencelabs/fluence-cli/commit/7872b0ec4c7f26f7bf99945ae7025dacbf1f5dc7))
* **tests:** fix smoke aqua test ([#231](https://github.com/fluencelabs/fluence-cli/issues/231)) ([4bc61ac](https://github.com/fluencelabs/fluence-cli/commit/4bc61ac0e47c543ad979210c5d62fce80fc29382))

## [0.4.3](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.2...fluence-cli-v0.4.3) (2023-04-05)


### Features

* **logs:** Add logs for deals. Improve command descriptions [fixes DXJ-335] ([#219](https://github.com/fluencelabs/fluence-cli/issues/219)) ([7d88b80](https://github.com/fluencelabs/fluence-cli/commit/7d88b80690ff4e2cd3fcd180474f0c9b0287f98b))
* update fluence js-client and remove legacy deploy tests ([#226](https://github.com/fluencelabs/fluence-cli/issues/226)) ([40ad15b](https://github.com/fluencelabs/fluence-cli/commit/40ad15b33c68164c732b5ade32c211e693f73f83))
* use pnpm internally and in ci and tests, improve error messages… [fixes FLU-290] ([#221](https://github.com/fluencelabs/fluence-cli/issues/221)) ([8e964a3](https://github.com/fluencelabs/fluence-cli/commit/8e964a34a044c6491212281abdb1afbd0e653df2))
* use prebuilt marine for tests ([#223](https://github.com/fluencelabs/fluence-cli/issues/223)) ([114aedc](https://github.com/fluencelabs/fluence-cli/commit/114aedc43047a41c7fbbdbfa64aedf63dee20a2b))


### Bug Fixes

* **deploy:** correct type for module config ([#227](https://github.com/fluencelabs/fluence-cli/issues/227)) ([0bd1dfb](https://github.com/fluencelabs/fluence-cli/commit/0bd1dfbf306cee4587668f740549ca1b8dbd3e71))

## [0.4.2](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.1...fluence-cli-v0.4.2) (2023-03-22)


### Bug Fixes

* compile installation spell in release action, add better template for spell, improve error messages ([#217](https://github.com/fluencelabs/fluence-cli/issues/217)) ([151e3ff](https://github.com/fluencelabs/fluence-cli/commit/151e3ffe67d9ed68677c93370c826655aeb4e981))

## [0.4.1](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.0...fluence-cli-v0.4.1) (2023-03-22)


### Features

* support spells [fixes DXJ-340 DXJ-341] ([#216](https://github.com/fluencelabs/fluence-cli/issues/216)) ([8fc6eb3](https://github.com/fluencelabs/fluence-cli/commit/8fc6eb34142ab78d560cbb09d5fe17695c444a75))
* update rust toolchain and marine tool versions ([#207](https://github.com/fluencelabs/fluence-cli/issues/207)) ([a00aec3](https://github.com/fluencelabs/fluence-cli/commit/a00aec3caa4e455584c475fd4a0755d9c5c2d0e4))

## [0.4.0](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.9...fluence-cli-v0.4.0) (2023-03-16)


### ⚠ BREAKING CHANGES

* renamed deployed.yaml to workers.yaml, renamed deals.aqua to workers.aqua.

### Features

* allow running `fluence workers logs` without initializing the project, don't show stack trace for expected errors ([#197](https://github.com/fluencelabs/fluence-cli/issues/197)) ([9a5036e](https://github.com/fluencelabs/fluence-cli/commit/9a5036e6f78602d441fd5f15ce436b45332d0cb9))
* improve service and module removal [fixes DXJ-320] ([#199](https://github.com/fluencelabs/fluence-cli/issues/199)) ([3f7866d](https://github.com/fluencelabs/fluence-cli/commit/3f7866dd0e09acbb2ea3d66ff1cdb9ea9e9516fa))
* minor improvements and refactoring [fixes DXJ-331] ([#202](https://github.com/fluencelabs/fluence-cli/issues/202)) ([bc12cdc](https://github.com/fluencelabs/fluence-cli/commit/bc12cdcaca7aa06904e7e87e3c7c19a0900a6eec))
* rename and extend deployed.yaml config [fixes DXJ-343] ([#205](https://github.com/fluencelabs/fluence-cli/issues/205)) ([b8cd0eb](https://github.com/fluencelabs/fluence-cli/commit/b8cd0eb3ac4523ddef30623f5f5d84117564a689))
* update copyright year ([#200](https://github.com/fluencelabs/fluence-cli/issues/200)) ([72866b5](https://github.com/fluencelabs/fluence-cli/commit/72866b52d076d172cbaeaeecb819d34c07e91e2c))
* update default fluence env in template ([#194](https://github.com/fluencelabs/fluence-cli/issues/194)) ([75c1f98](https://github.com/fluencelabs/fluence-cli/commit/75c1f9893eaa6efb56b1a3e51dc486ed1bc29329))
* update fluence js client [fixes DXJ-244 DXJ-330] ([#203](https://github.com/fluencelabs/fluence-cli/issues/203)) ([29e11cd](https://github.com/fluencelabs/fluence-cli/commit/29e11cd9228fec8f3b57aeddd8c25508df3101b7))
* update marine cli and mrepl  minor versions ([#201](https://github.com/fluencelabs/fluence-cli/issues/201)) ([fd513a8](https://github.com/fluencelabs/fluence-cli/commit/fd513a8c84415e164f0f0064e03b68231834480e))

## [0.3.9](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.8...fluence-cli-v0.3.9) (2023-03-01)


### Features

* add flags for getting worker logs by ids ([#195](https://github.com/fluencelabs/fluence-cli/issues/195)) ([8c15414](https://github.com/fluencelabs/fluence-cli/commit/8c154142c1d945e1eb4adc068af463b1e153b6d1))

## [0.3.8](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.7...fluence-cli-v0.3.8) (2023-02-28)


### Bug Fixes

* lokijs ([#192](https://github.com/fluencelabs/fluence-cli/issues/192)) ([918b301](https://github.com/fluencelabs/fluence-cli/commit/918b30104b97e2e144b8ba00ef4b8088e14dd69f))

## [0.3.7](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.6...fluence-cli-v0.3.7) (2023-02-28)


### Features

* **blockchain:** Migrate to walletconnect v2 ([#190](https://github.com/fluencelabs/fluence-cli/issues/190)) ([9fdbf54](https://github.com/fluencelabs/fluence-cli/commit/9fdbf54828fd91ef9d21209fd5819536f102d565))

## [0.3.6](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.5...fluence-cli-v0.3.6) (2023-02-27)


### Features

* update upload_deploy function [fixes DXJ-323] ([#188](https://github.com/fluencelabs/fluence-cli/issues/188)) ([584f5c8](https://github.com/fluencelabs/fluence-cli/commit/584f5c8133bd107cfce01514fb0c51ba8fa7b36e))


### Bug Fixes

* legacy deploy [fixes DXJ-321] ([#185](https://github.com/fluencelabs/fluence-cli/issues/185)) ([730fa1a](https://github.com/fluencelabs/fluence-cli/commit/730fa1a4e94e879362d709716d2ea73ca7cb06f3))

## [0.3.5](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.4...fluence-cli-v0.3.5) (2023-02-27)


### Bug Fixes

* aqua interface service_id generation [fixes DXJ-322] ([#186](https://github.com/fluencelabs/fluence-cli/issues/186)) ([a4230ae](https://github.com/fluencelabs/fluence-cli/commit/a4230aea7169ecd498019bd9584a8f5c37cbe33c))

## [0.3.4](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.3...fluence-cli-v0.3.4) (2023-02-25)


### Features

* update aqua version [fixes DXJ-317] ([#183](https://github.com/fluencelabs/fluence-cli/issues/183)) ([c0b1457](https://github.com/fluencelabs/fluence-cli/commit/c0b1457e6ad414a4fee451f51dbd31a115d2e618))

## [0.3.3](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.2...fluence-cli-v0.3.3) (2023-02-24)


### Features

* remove spinner, fix relative aqua file compilation, hide some deal-related commands, allow service and module configs not to be called service.yaml and module.yaml (full path to the config with .yaml extension is needed for this to work), don't add serviceName to defaultWorker if it's already there, simplify and refactor building of modules before deploying workers, change uploaded module config so it uses records instead of arrays of tuples [fixes DXJ-316] ([#180](https://github.com/fluencelabs/fluence-cli/issues/180)) ([1cf2b20](https://github.com/fluencelabs/fluence-cli/commit/1cf2b20b1e727297f015b3ad77e999c79c5e866d))

## [0.3.2](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.1...fluence-cli-v0.3.2) (2023-02-24)


### Features

* **blockchain:** change addresses ([#175](https://github.com/fluencelabs/fluence-cli/issues/175)) ([aa34a69](https://github.com/fluencelabs/fluence-cli/commit/aa34a69321fcf3ece70f94d0e339ca84174ecbeb))


### Bug Fixes

* **ci:** Skip husky install when running in CI ([#170](https://github.com/fluencelabs/fluence-cli/issues/170)) ([e9ef7af](https://github.com/fluencelabs/fluence-cli/commit/e9ef7af4c2cd0125359995b3952f0ab60de9f94c))
* **deps:** update dependency @fluencelabs/installation-spell to ^0.5.0 ([#169](https://github.com/fluencelabs/fluence-cli/issues/169)) ([a6c0b45](https://github.com/fluencelabs/fluence-cli/commit/a6c0b455da56aa829e575871aa6d3275c5cf0050))
* **deps:** update dependency @fluencelabs/spell to ^0.5.0 ([#177](https://github.com/fluencelabs/fluence-cli/issues/177)) ([4912def](https://github.com/fluencelabs/fluence-cli/commit/4912def825ce276f3ba1208c004b231d38d59058))
* service interface generation [fixes DXJ-315] ([#179](https://github.com/fluencelabs/fluence-cli/issues/179)) ([175159d](https://github.com/fluencelabs/fluence-cli/commit/175159db57b517019183c999f0cf123fa3a8f116))

## [0.3.1](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.3.0...fluence-cli-v0.3.1) (2023-02-24)


### Features

* improve error messages for `worker deploy`, infer empty object and empty array as optional instead of throwing an error [fixes DXJ-310] ([#174](https://github.com/fluencelabs/fluence-cli/issues/174)) ([ac01f29](https://github.com/fluencelabs/fluence-cli/commit/ac01f297b2e8171658319a6af08a07f684fb263d))

## [0.3.0](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.46...fluence-cli-v0.3.0) (2023-02-23)


### ⚠ BREAKING CHANGES

* different way of storing service interfaces and merged all configs into one fluence.yaml [fixes DXJ-308]

### Features

* Improvements and fixes for deals flow BREAKING CHANGE: different way of storing service interfaces and merged all configs into one fluence.yaml [fixes DXJ-308] ([#172](https://github.com/fluencelabs/fluence-cli/issues/172)) ([e07ad4d](https://github.com/fluencelabs/fluence-cli/commit/e07ad4dc908acfbf3e05ccae1bd4c08b2b7afd8b))

## [0.2.46](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.45...fluence-cli-v0.2.46) (2023-02-21)


### Bug Fixes

* **blockchain:** fix chainId ([#167](https://github.com/fluencelabs/fluence-cli/issues/167)) ([21bc546](https://github.com/fluencelabs/fluence-cli/commit/21bc5465a97695f0636b69e072522cabfdff78ee))
* fix chainId ([21bc546](https://github.com/fluencelabs/fluence-cli/commit/21bc5465a97695f0636b69e072522cabfdff78ee))

## [0.2.45](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.44...fluence-cli-v0.2.45) (2023-02-21)


### Features

* Add a root Cargo.toml with workspaces, do some refactoring [fixes DXJ-295] ([#165](https://github.com/fluencelabs/fluence-cli/issues/165)) ([538c484](https://github.com/fluencelabs/fluence-cli/commit/538c4842751757f7598dd563e7977482b132ce22))


### Bug Fixes

* **deps:** update dependency @oclif/plugin-autocomplete to v2 ([#155](https://github.com/fluencelabs/fluence-cli/issues/155)) ([95f526a](https://github.com/fluencelabs/fluence-cli/commit/95f526a056dfd01798c1611e38cf68ef7fd01565))

## [0.2.44](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.43...fluence-cli-v0.2.44) (2023-02-20)


### Bug Fixes

* **blockchain:** change testnet ([#163](https://github.com/fluencelabs/fluence-cli/issues/163)) ([ba077d3](https://github.com/fluencelabs/fluence-cli/commit/ba077d32d416f68f3e38225ff546dd09c276fdd2))

## [0.2.43](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.42...fluence-cli-v0.2.43) (2023-02-20)


### Features

* add `fluence default peers` command [fixes DXJ-303] ([#160](https://github.com/fluencelabs/fluence-cli/issues/160)) ([16eba7f](https://github.com/fluencelabs/fluence-cli/commit/16eba7fb08327b9c53770090811dff39ca38357b))
* add `fluence workers logs` command [fixes DXJ-297] ([#153](https://github.com/fluencelabs/fluence-cli/issues/153)) ([53585a2](https://github.com/fluencelabs/fluence-cli/commit/53585a2f999b13585f36bb83a5f77c05a6e52838))


### Bug Fixes

* don't print result of aqua call twice, check that workers have services and that peerIds is not an empty array when deploying workers, prettify error messages  [fixes DXJ-301] ([#161](https://github.com/fluencelabs/fluence-cli/issues/161)) ([afb6d75](https://github.com/fluencelabs/fluence-cli/commit/afb6d75f41eb04d99bf50b92a05093f3a0a8adea))
* migrate to mumbai testnet ([#162](https://github.com/fluencelabs/fluence-cli/issues/162)) ([28f7ce2](https://github.com/fluencelabs/fluence-cli/commit/28f7ce29d2865f1e22151b7f270cbde1f0d4184f))

## [0.2.42](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.41...fluence-cli-v0.2.42) (2023-02-17)


### Features

* move deploy command to `fluence deal deploy`, add `fluence workers upload`, allow deployment of workers that you specified in a comma-separated argument [fixes DXJ-294] ([#150](https://github.com/fluencelabs/fluence-cli/issues/150)) ([ff268ce](https://github.com/fluencelabs/fluence-cli/commit/ff268ce42488c9591ff470cbef36121a2a265c62))


### Bug Fixes

* **deps:** update dependency @fluencelabs/aqua-api to v0.10.1 ([#151](https://github.com/fluencelabs/fluence-cli/issues/151)) ([e92f453](https://github.com/fluencelabs/fluence-cli/commit/e92f453f88221d6b597447520dd327cc6e2513a9))

## [0.2.41](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.40...fluence-cli-v0.2.41) (2023-02-16)


### Features

* Incorporate Aqua v0.10.0 [DXJ-290] ([#148](https://github.com/fluencelabs/fluence-cli/issues/148)) ([97b7dbe](https://github.com/fluencelabs/fluence-cli/commit/97b7dbec63b01f72cee89517e77159c5aadabd45))

## [0.2.40](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.39...fluence-cli-v0.2.40) (2023-02-15)


### Features

* add deployment for workers with deals [fixes DXJ-287] ([#146](https://github.com/fluencelabs/fluence-cli/issues/146)) ([a92b65b](https://github.com/fluencelabs/fluence-cli/commit/a92b65b0700e2ec56bbcbb1f7777077a3f17f7ef))

## [0.2.39](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.38...fluence-cli-v0.2.39) (2023-02-15)


### Bug Fixes

* add ttl flag and increase default timeout for `fluence workers deploy`. Add process.exit after reporting an error ([#144](https://github.com/fluencelabs/fluence-cli/issues/144)) ([1bc9200](https://github.com/fluencelabs/fluence-cli/commit/1bc9200860a97edc30057b4c1ae9886793d2d742))

## [0.2.38](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.37...fluence-cli-v0.2.38) (2023-02-15)


### Features

* add configs for workers (worker.yaml), direct hosting (hosts.yaml) and deployment result (deployed.yaml). Add command for worker deployment. Add command for showing versions of used dependencies. Fix issue with circular imports [fixes DXJ-246 DXJ-247 DXJ-259 DXJ-249 DXJ-270] ([#141](https://github.com/fluencelabs/fluence-cli/issues/141)) ([2659d9d](https://github.com/fluencelabs/fluence-cli/commit/2659d9dfa3ddd6c28c0fc81cb5abba2a900d615b))
* **docs:** README update ([#139](https://github.com/fluencelabs/fluence-cli/issues/139)) ([95a70ec](https://github.com/fluencelabs/fluence-cli/commit/95a70ece5584c0c69b421dd21821aaa159aadd30))
* update pkg @fluencelabs/deal-aurora ([#143](https://github.com/fluencelabs/fluence-cli/issues/143)) ([2a49316](https://github.com/fluencelabs/fluence-cli/commit/2a4931609e7629cd66e4dba5be5bd9785546a0a7))

## [0.2.37](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.36...fluence-cli-v0.2.37) (2023-02-07)


### Features

* migrate to es modules [fixes DXJ-252] ([#133](https://github.com/fluencelabs/fluence-cli/issues/133)) ([5806510](https://github.com/fluencelabs/fluence-cli/commit/58065108f9cfaf2283f62373062bcf5b5b23b269))
* refactor and fix module and service `add` commands, update dependency versions,  enforce rust toolchain  override each time marine and mrepl are used, make dev builds faster by removing type-cheking for dev mode [fixes DXJ-251] ([#131](https://github.com/fluencelabs/fluence-cli/issues/131)) ([53a7446](https://github.com/fluencelabs/fluence-cli/commit/53a74466dc0fbc58596a02d00a136843a0686df2))
* update pkg @fluencelabs/deal-aurora ([#135](https://github.com/fluencelabs/fluence-cli/issues/135)) ([42fa72b](https://github.com/fluencelabs/fluence-cli/commit/42fa72bc66ed31cf9291874fd2986b0c4e7e31c3))


### Bug Fixes

* Countly hanging cli and refactor [fixes DXJ-262] ([#138](https://github.com/fluencelabs/fluence-cli/issues/138)) ([8a642fb](https://github.com/fluencelabs/fluence-cli/commit/8a642fb4426eb14a884c0b7692ffc8a2b6ae28ca))
* update pkg @fluencelabs/deal-aurora to 0.1.3 ([#128](https://github.com/fluencelabs/fluence-cli/issues/128)) ([1641305](https://github.com/fluencelabs/fluence-cli/commit/16413059fbacbb3d20019bbae394906fe3873fba))

## [0.2.36](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.35...fluence-cli-v0.2.36) (2023-01-26)


### Features

* add print particle id flag to fluence run [fixes DXJ-241] ([#122](https://github.com/fluencelabs/fluence-cli/issues/122)) ([ec7f55e](https://github.com/fluencelabs/fluence-cli/commit/ec7f55ed2838ca49e2de557e5653045f26626155))
* update oclif dependencies to latest [fixes DXJ-243] ([#126](https://github.com/fluencelabs/fluence-cli/issues/126)) ([697382c](https://github.com/fluencelabs/fluence-cli/commit/697382c5916ee9d96fab1df5dedc05c4c217b013))


### Bug Fixes

* **deps:** update dependency @fluencelabs/aqua-api to v0.9.3 ([#118](https://github.com/fluencelabs/fluence-cli/issues/118)) ([42d8c30](https://github.com/fluencelabs/fluence-cli/commit/42d8c30012cce21531cc162c8444bbd0fdf2bc49))
* don't print interface definition [fixes DXJ-239] ([#124](https://github.com/fluencelabs/fluence-cli/issues/124)) ([fcfd6e1](https://github.com/fluencelabs/fluence-cli/commit/fcfd6e1d76a16bed9e31fc2416c115a5c24f8a92))
* generate schema file only after making sure config will exist, f… ([#121](https://github.com/fluencelabs/fluence-cli/issues/121)) ([0641bef](https://github.com/fluencelabs/fluence-cli/commit/0641bef952aa337aaf3085199eb4a12814871313))

## [0.2.35](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.34...fluence-cli-v0.2.35) (2023-01-20)


### Features

* **run:** implicitly import aqua lib if not inside fluence project, automatically add to fluence.yaml if missing [fixes DXJ-231] ([#115](https://github.com/fluencelabs/fluence-cli/issues/115)) ([6ab49d4](https://github.com/fluencelabs/fluence-cli/commit/6ab49d4475db94984bec7a29299376c19484e17b))


### Bug Fixes

* **env:** solve issue with undefined env variable [fixes DXJ-237] ([#116](https://github.com/fluencelabs/fluence-cli/issues/116)) ([8029a84](https://github.com/fluencelabs/fluence-cli/commit/8029a847eea950fee7d021320d270d65c9f02e8f))

## [0.2.34](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.33...fluence-cli-v0.2.34) (2023-01-19)


### Features

* **chain:** update url for cli connector [fixes DXJ-234] ([#111](https://github.com/fluencelabs/fluence-cli/issues/111)) ([8f0b001](https://github.com/fluencelabs/fluence-cli/commit/8f0b001f80290b770c7d0e5f0a1137586b7c33b2))
* **dependencies:** remove required dependencies [DXJ-227] ([#87](https://github.com/fluencelabs/fluence-cli/issues/87)) ([7588606](https://github.com/fluencelabs/fluence-cli/commit/7588606a7411db5a2921049774b76ec2f8f3988c))
* **run:** use --input flag to search for project root dir path [fixes DXJ-232] ([#113](https://github.com/fluencelabs/fluence-cli/issues/113)) ([b3c7897](https://github.com/fluencelabs/fluence-cli/commit/b3c789750ad8e87687974ccb47a972db1d0832df))
* **tests:** add env variable for user's fluence dir path [fixes DXJ-228] ([#112](https://github.com/fluencelabs/fluence-cli/issues/112)) ([9193992](https://github.com/fluencelabs/fluence-cli/commit/919399210b4e85fe47b4d253651ded8113731526))


### Bug Fixes

* **dependencies:** update aqua and rust versions [fixes DXJ-236] ([#109](https://github.com/fluencelabs/fluence-cli/issues/109)) ([becb28b](https://github.com/fluencelabs/fluence-cli/commit/becb28b9d7b1ba6451e108ad649d6b0162a15864))

## [0.2.33](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.2.32...fluence-cli-v0.2.33) (2023-01-18)


### Features

* **deal:** migrate deal cli [fixes DXJ-221] ([9a462a2](https://github.com/fluencelabs/fluence-cli/commit/9a462a2674739e16b93dd41fa6e006c7c4bc453f))
* **dependencies:** update fluence-js and aqua version [fixes DXJ-233] ([#104](https://github.com/fluencelabs/fluence-cli/issues/104)) ([255ff83](https://github.com/fluencelabs/fluence-cli/commit/255ff8359cd787728fcd9342fbca218386a3f75e))


### Bug Fixes

* **deps:** update dependency @fluencelabs/aqua-api to v0.9.2 ([#107](https://github.com/fluencelabs/fluence-cli/issues/107)) ([26b329f](https://github.com/fluencelabs/fluence-cli/commit/26b329fe99b6a5e499b6555766b8e4005df49ff5))
