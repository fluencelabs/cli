# Changelog

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
