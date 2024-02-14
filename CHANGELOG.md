# Changelog

## [0.14.4](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.14.3...fluence-cli-v0.14.4) (2024-02-14)


### Features

* trigger build ([#757](https://github.com/fluencelabs/cli/issues/757)) ([10da9dd](https://github.com/fluencelabs/cli/commit/10da9dd2d38d2392af0d2b04239694d10c00a819))


### Bug Fixes

* change build order ([755c1c6](https://github.com/fluencelabs/cli/commit/755c1c6418bcaa26174f44d222cff5f0bb1d5e2a))
* move exit cli ([#759](https://github.com/fluencelabs/cli/issues/759)) ([e32c927](https://github.com/fluencelabs/cli/commit/e32c927402eb90e6b7257bae591e38802c06a9ce))

## [0.14.3](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.14.2...fluence-cli-v0.14.3) (2024-02-13)


### Bug Fixes

* adapt gateway template to vercel deployment ([#750](https://github.com/fluencelabs/cli/issues/750)) ([4601741](https://github.com/fluencelabs/cli/commit/4601741afcd975bd9c28b762711790aff90c8bac))
* fix aqua compilation path resolution [fixes DXJ-711] ([#751](https://github.com/fluencelabs/cli/issues/751)) ([d44e9e3](https://github.com/fluencelabs/cli/commit/d44e9e35127fe405cc399ef44ce0e9b4f6d01c8f))
* Fix JS environment in Vercel template ([#755](https://github.com/fluencelabs/cli/issues/755)) ([c6eb6f3](https://github.com/fluencelabs/cli/commit/c6eb6f3ac7761d79714509e4780ca83b963480e5))
* improver README [fixes DXJ-624 DXJ-681] ([#753](https://github.com/fluencelabs/cli/issues/753)) ([2956d5d](https://github.com/fluencelabs/cli/commit/2956d5d77db8fdb82c1c8e9e6666264259379831))

## [0.14.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.14.1...fluence-cli-v0.14.2) (2024-02-09)


### Bug Fixes

* Adopt new serialization API from JS client ([#747](https://github.com/fluencelabs/cli/issues/747)) ([baff9d5](https://github.com/fluencelabs/cli/commit/baff9d5b9d2449161cec88ed66a4a701cb222cf2))
* **deps:** update dependency @fluencelabs/js-client to v0.8.3 ([#749](https://github.com/fluencelabs/cli/issues/749)) ([40fa9ef](https://github.com/fluencelabs/cli/commit/40fa9effdb33fa1be48c54a533fa964816942795))

## [0.14.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.14.0...fluence-cli-v0.14.1) (2024-02-05)


### Features

* add default env for provider ([#744](https://github.com/fluencelabs/cli/issues/744)) ([cbf69fc](https://github.com/fluencelabs/cli/commit/cbf69fc0478f27731817f1bb951e3a5357ad222a))
* support multiple aqua configs [fixes DXJ-641] ([#743](https://github.com/fluencelabs/cli/issues/743)) ([f7213f8](https://github.com/fluencelabs/cli/commit/f7213f893e11dc0df8328740ff8fcc746157c249))
* update aqua to 0.14.0 ([#739](https://github.com/fluencelabs/cli/issues/739)) ([7f81e7e](https://github.com/fluencelabs/cli/commit/7f81e7eecf57f04c3126dee66456a81c160640bb))
* use npm-aqua-compiler 0.0.3 ([#741](https://github.com/fluencelabs/cli/issues/741)) ([c2ee892](https://github.com/fluencelabs/cli/commit/c2ee89282c3ac762459af3c123997945778109d7))


### Bug Fixes

* **deps:** update dependency @fluencelabs/js-client to v0.8.0 ([#742](https://github.com/fluencelabs/cli/issues/742)) ([deeb9ca](https://github.com/fluencelabs/cli/commit/deeb9caf61f6364976f3e370c854f8d1a86323ac))
* Improve gateway template readme content  ([#746](https://github.com/fluencelabs/cli/issues/746)) ([671dab8](https://github.com/fluencelabs/cli/commit/671dab83286cd8a2e5222ec86e25a326eeca9ad2))
* **test:** Add `aqua` header to spell file ([#737](https://github.com/fluencelabs/cli/issues/737)) ([8c23c19](https://github.com/fluencelabs/cli/commit/8c23c19b24c83c75ee77af9d44b046113e102d88))

## [0.14.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.13.5...fluence-cli-v0.14.0) (2024-01-26)


### ⚠ BREAKING CHANGES

* **deps:** update dependency @fluencelabs/js-client to v0.7.0 ([#735](https://github.com/fluencelabs/cli/issues/735))

### Features

* Introduce gateway template ([#732](https://github.com/fluencelabs/cli/issues/732)) ([c3e594b](https://github.com/fluencelabs/cli/commit/c3e594b7416ff07a1167822f9946870f7eea0603))


### Bug Fixes

* **deps:** update dependency @fluencelabs/js-client to v0.7.0 ([#735](https://github.com/fluencelabs/cli/issues/735)) ([f56f451](https://github.com/fluencelabs/cli/commit/f56f45177f7bebd939e9148b0c1986b79a63009c))
* maybe fix seed bug [fixes DXJ-639] ([#734](https://github.com/fluencelabs/cli/issues/734)) ([85c5a96](https://github.com/fluencelabs/cli/commit/85c5a966f768d7743b97103e8467a6eda5389b86))
* **tests:** DXJ-617 fix environment problems ([#731](https://github.com/fluencelabs/cli/issues/731)) ([dc4a098](https://github.com/fluencelabs/cli/commit/dc4a098c146d83859636d93dcdfaca5665de382a))

## [0.13.5](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.13.4...fluence-cli-v0.13.5) (2024-01-22)


### Features

* add `dep i` reminder ([#730](https://github.com/fluencelabs/cli/issues/730)) ([256c56c](https://github.com/fluencelabs/cli/commit/256c56c9333a07d9c2a51bfd124adcb675e0b0ed))
* add aqua header to services empty file ([#717](https://github.com/fluencelabs/cli/issues/717)) ([d340813](https://github.com/fluencelabs/cli/commit/d340813470b7cdee3d3fa839c21abf20d397bb7a))
* add SPELL-NAME arg to deal logs ([#718](https://github.com/fluencelabs/cli/issues/718)) ([b20a571](https://github.com/fluencelabs/cli/commit/b20a571b4dbd7700a36b216c49331e4100505772))
* **cli:** Add `aqua` header to `services.aqua` file ([#716](https://github.com/fluencelabs/cli/issues/716)) ([66dd9eb](https://github.com/fluencelabs/cli/commit/66dd9ebb38d077e7fa0a4181851dc2d585865982))
* improve docs and validation for memory limit [fixes DXJ-619 DXJ-546 DXJ-620] ([#713](https://github.com/fluencelabs/cli/issues/713)) ([a939c6e](https://github.com/fluencelabs/cli/commit/a939c6ef8a2f18bbd35d8c7a8c34dca44b591f54))
* set default number of compute units to 32 ([#704](https://github.com/fluencelabs/cli/issues/704)) ([eac6aa3](https://github.com/fluencelabs/cli/commit/eac6aa3fbb0963c71ec1c9a97f83234c6bbaac45))
* simplify dependency related commands and rename dependency related properties in fluence.yaml [fixes DXJ-634 DXJ-598] ([#721](https://github.com/fluencelabs/cli/issues/721)) ([7ee6bd0](https://github.com/fluencelabs/cli/commit/7ee6bd013c6b1f9fd03f5638283b3493456a9c5a))
* **test:** DXJ-574 updating the deal by changing a spell ([#697](https://github.com/fluencelabs/cli/issues/697)) ([c4cc310](https://github.com/fluencelabs/cli/commit/c4cc310ed8de0525a05981dac58e951e1a507b6a))
* up js client 0.6.0 ([#725](https://github.com/fluencelabs/cli/issues/725)) ([c410c7a](https://github.com/fluencelabs/cli/commit/c410c7ab2d946c21908d129f63311b4892e8bd4f))


### Bug Fixes

* **deps:** update spell to v0.6.6 ([#706](https://github.com/fluencelabs/cli/issues/706)) ([6d10586](https://github.com/fluencelabs/cli/commit/6d10586814ac81929897f762aac37d8516a17642))
* **deps:** update spell to v0.6.7 ([#715](https://github.com/fluencelabs/cli/issues/715)) ([f542353](https://github.com/fluencelabs/cli/commit/f542353dc8acfddd5cbb0420cfd342478c14f775))
* **tests:** Add `aqua` header to `smoke.aqua` ([#719](https://github.com/fluencelabs/cli/issues/719)) ([1400b66](https://github.com/fluencelabs/cli/commit/1400b660439838f0a4a45f6beaeaefc407fd73ae))

## [0.13.4](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.13.3...fluence-cli-v0.13.4) (2024-01-11)


### Features

* ensure memory limit of worker services is less then 2GB and pass it to installation spell [fixes DXJ-579 DXJ-545 DXJ-580 DXJ-546] ([#700](https://github.com/fluencelabs/cli/issues/700)) ([88a0e5f](https://github.com/fluencelabs/cli/commit/88a0e5fbf8f267ead868d8b6aeb7d810c5429b83))
* update dependencies ([#701](https://github.com/fluencelabs/cli/issues/701)) ([16e293f](https://github.com/fluencelabs/cli/commit/16e293f803d111c7ff663182df078adc37a7f456))


### Bug Fixes

* module remove ([#703](https://github.com/fluencelabs/cli/issues/703)) ([8103c46](https://github.com/fluencelabs/cli/commit/8103c463b1ff4170906ab4e7bc44197f70096272))
* remove global deps completely ([#698](https://github.com/fluencelabs/cli/issues/698)) ([34bb519](https://github.com/fluencelabs/cli/commit/34bb51965fbbc2e0ed77d43935ad6e8f2dec4523))
* secret key remove ([#702](https://github.com/fluencelabs/cli/issues/702)) ([5216e96](https://github.com/fluencelabs/cli/commit/5216e96f59692b0b5a005a8076dd85f4ac6bdb3b))

## [0.13.3](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.13.2...fluence-cli-v0.13.3) (2024-01-05)


### Features

* add memory limit in mrepl by default ([#696](https://github.com/fluencelabs/cli/issues/696)) ([6de1dea](https://github.com/fluencelabs/cli/commit/6de1deac3af0feec5b9e9cfea8ece9191fb5825f))
* improve provider config management ([#691](https://github.com/fluencelabs/cli/issues/691)) ([8fa0b3e](https://github.com/fluencelabs/cli/commit/8fa0b3efd43dd8a9244ec9bd152c612ac0233aae))
* **test:** DXJ-575 updating the deal by changing a service ([#670](https://github.com/fluencelabs/cli/issues/670)) ([a6c44e6](https://github.com/fluencelabs/cli/commit/a6c44e686a548e783391a3f876958c63ad86e135))
* unhide provider commands ([#694](https://github.com/fluencelabs/cli/issues/694)) ([50972b5](https://github.com/fluencelabs/cli/commit/50972b56ae036b08ca4a64838c2341db6d881595))


### Bug Fixes

* try `local down` only when not in CI ([#692](https://github.com/fluencelabs/cli/issues/692)) ([7f20b8b](https://github.com/fluencelabs/cli/commit/7f20b8b918744e4392bd36d58113bf95782ce616))

## [0.13.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.13.1...fluence-cli-v0.13.2) (2023-12-29)


### Features

* **cli:** Add header to default spell aqua ([#671](https://github.com/fluencelabs/cli/issues/671)) ([cc9b841](https://github.com/fluencelabs/cli/commit/cc9b841751d6aa6350abbafce32770fc40153d47))


### Bug Fixes

* **deps:** update dependency @fluencelabs/air-beautify-wasm to v0.3.6 ([#658](https://github.com/fluencelabs/cli/issues/658)) ([6b827d9](https://github.com/fluencelabs/cli/commit/6b827d9b87c08f07df7e9761faf4dc06d28996f9))
* **deps:** update dependency @fluencelabs/aqua-api to v0.13.3 ([#668](https://github.com/fluencelabs/cli/issues/668)) ([a9f8678](https://github.com/fluencelabs/cli/commit/a9f867800cb6ce7bdb3825293f4f719bcd03b0d0))
* **deps:** update dependency @fluencelabs/aqua-to-js to v0.3.5 ([#591](https://github.com/fluencelabs/cli/issues/591)) ([2c82d84](https://github.com/fluencelabs/cli/commit/2c82d84cd6dccd02e7240c868b98c4a30dc22e73))

## [0.13.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.13.0...fluence-cli-v0.13.1) (2023-12-28)


### Features

* add secrets config [fixes DXJ-543] ([#645](https://github.com/fluencelabs/cli/issues/645)) ([97a0b9a](https://github.com/fluencelabs/cli/commit/97a0b9aa4561c544eed49e42405c172bcec2ebf4))
* compile all spells on `fluence build` [fixes DXJ-353] ([#634](https://github.com/fluencelabs/cli/issues/634)) ([c18253b](https://github.com/fluencelabs/cli/commit/c18253b7ffd0dd0d44506e28c345ee5f67b6969a))
* create a working local env automatically [fixes DXJ-528] ([#640](https://github.com/fluencelabs/cli/issues/640)) ([6108503](https://github.com/fluencelabs/cli/commit/61085030cafc5d66aa7e21295a652afcdf297ef9))
* deposit check ([#653](https://github.com/fluencelabs/cli/issues/653)) ([6cf91df](https://github.com/fluencelabs/cli/commit/6cf91df2443f2fcf26d7f1dcd1fdf50fe1125a30))
* move some flags into configs for provider and deploy ([#635](https://github.com/fluencelabs/cli/issues/635)) ([93a3588](https://github.com/fluencelabs/cli/commit/93a3588bc38cd961d6abfd88089380a698a58e36))
* remove CID change check ([#647](https://github.com/fluencelabs/cli/issues/647)) ([b917b6e](https://github.com/fluencelabs/cli/commit/b917b6e4a8f5c828d6e1b118330f2f46ee5d3a4c))
* remove exact validation from npm ([#672](https://github.com/fluencelabs/cli/issues/672)) ([7534648](https://github.com/fluencelabs/cli/commit/7534648f8a0ef90d4564ceb2293ea2cd8a1932f7))
* remove vite polyfills ([#646](https://github.com/fluencelabs/cli/issues/646)) ([e31dde5](https://github.com/fluencelabs/cli/commit/e31dde5288ba6d0722d41ae28114fe9804f41e23))
* show spells separately in showSubnet [NET-635] ([#624](https://github.com/fluencelabs/cli/issues/624)) ([d481934](https://github.com/fluencelabs/cli/commit/d4819340deda066dd5729956608f52a21375351f))
* store deployment artifacts per-env [fixes DXJ-500] ([#644](https://github.com/fluencelabs/cli/issues/644)) ([42cd42c](https://github.com/fluencelabs/cli/commit/42cd42c6d9112398dddc7b5adef64779f2d4a0a9))
* update default aqua dependencies ([#667](https://github.com/fluencelabs/cli/issues/667)) ([490e42e](https://github.com/fluencelabs/cli/commit/490e42e6c410256f51feb2bf8f16522067917c2e))
* Use js-client 0.5.0 ([#630](https://github.com/fluencelabs/cli/issues/630)) ([2fa61d0](https://github.com/fluencelabs/cli/commit/2fa61d007c1c91bc77b4c2f4174d68fcecdd317a))
* use new aqua packages [fixes DXJ-534, DXJ-529, DXJ-478, DXJ-370] ([#648](https://github.com/fluencelabs/cli/issues/648)) ([6d1b92e](https://github.com/fluencelabs/cli/commit/6d1b92e74ffb60d3861677cb3f61efa435249fec))


### Bug Fixes

* **deps:** update spell to v0.6.1 ([#664](https://github.com/fluencelabs/cli/issues/664)) ([64f64f7](https://github.com/fluencelabs/cli/commit/64f64f7194889abc6d2eaf2d2d33157953218247))
* **deps:** update spell to v0.6.4 ([#674](https://github.com/fluencelabs/cli/issues/674)) ([a79b6bc](https://github.com/fluencelabs/cli/commit/a79b6bcc6bb58287c2afeefb8bab4dcef1b471b6))
* don't update dependencies that are already present ([#666](https://github.com/fluencelabs/cli/issues/666)) ([213670b](https://github.com/fluencelabs/cli/commit/213670b7c1cbb3a76d831703d328da3ad35fa30a))
* improve errors for configs ([#637](https://github.com/fluencelabs/cli/issues/637)) ([5afc8f5](https://github.com/fluencelabs/cli/commit/5afc8f5c2bc4626fb881c98993c141c6bbd633b2))
* npm to be used by cli internal nodejs executable [fixes DXJ-540] ([#642](https://github.com/fluencelabs/cli/issues/642)) ([df67287](https://github.com/fluencelabs/cli/commit/df67287e9c7d1d8b548ea32917363b456a1cb0db))
* ps output ([#650](https://github.com/fluencelabs/cli/issues/650)) ([fe165d6](https://github.com/fluencelabs/cli/commit/fe165d6f64eafb20417b588cbe78cafb5bf2dd5f))
* raw config to be parsed, improve local up and service new [fixes DXJ-564] ([#649](https://github.com/fluencelabs/cli/issues/649)) ([ca308df](https://github.com/fluencelabs/cli/commit/ca308df6e43fe847665095183f002fcfc53b0d6c))
* service not added to default deal services ([#655](https://github.com/fluencelabs/cli/issues/655)) ([f832f83](https://github.com/fluencelabs/cli/commit/f832f83cf3bae8fa1b6f4caac849c2864191661d))
* Support fire and forget (DXJ-562) ([#652](https://github.com/fluencelabs/cli/issues/652)) ([abf4b74](https://github.com/fluencelabs/cli/commit/abf4b74002365b03dcdf8a4cf22b4031beee2130))
* update deal pkg ([#631](https://github.com/fluencelabs/cli/issues/631)) ([a8e3e9c](https://github.com/fluencelabs/cli/commit/a8e3e9cad48b068119c042717721fed45881a066))

## [0.13.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.12.5...fluence-cli-v0.13.0) (2023-11-16)


### ⚠ BREAKING CHANGES

* **deal:** Deal lifecycle

### Features

* **deal:** Deal lifecycle ([f3763e9](https://github.com/fluencelabs/cli/commit/f3763e95136494e70f745a3d04eee5225fc2ff3f))
* improve custom relay error ([#622](https://github.com/fluencelabs/cli/issues/622)) ([8038102](https://github.com/fluencelabs/cli/commit/8038102b4e54d2290fa52d625ee118e567dd1aca))
* update deps ([#623](https://github.com/fluencelabs/cli/issues/623)) ([ae406b4](https://github.com/fluencelabs/cli/commit/ae406b4a8005d01f8b0cb8f190cdfe86d15da9a4))


### Bug Fixes

* generate key after config is generated ([#620](https://github.com/fluencelabs/cli/issues/620)) ([2bff233](https://github.com/fluencelabs/cli/commit/2bff233c14742bd4e637aed4c3d624dedddb6271))
* update ts and js README ([#618](https://github.com/fluencelabs/cli/issues/618)) ([ea208b4](https://github.com/fluencelabs/cli/commit/ea208b463d5a66d59c0fad6a1e6322546aaf194b))

## [0.12.5](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.12.4...fluence-cli-v0.12.5) (2023-11-14)


### Bug Fixes

* Set chain image to public one, configure renovate to bump deal and chain versions ([#619](https://github.com/fluencelabs/cli/issues/619)) ([bc47802](https://github.com/fluencelabs/cli/commit/bc478023f600f8691b62b44f1d62dcd57cf599e1))
* **tests:** Use streams instead of options [LNG-277] ([#617](https://github.com/fluencelabs/cli/issues/617)) ([9ba5e20](https://github.com/fluencelabs/cli/commit/9ba5e20444e199b021d13480cdc5ff01c411a4cf))
* up installation spell ([#615](https://github.com/fluencelabs/cli/issues/615)) ([f8ed578](https://github.com/fluencelabs/cli/commit/f8ed578294455291db0474017943a79b066f1b63))

## [0.12.4](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.12.3...fluence-cli-v0.12.4) (2023-11-10)


### Bug Fixes

* improve docs ([#613](https://github.com/fluencelabs/cli/issues/613)) ([049ba1e](https://github.com/fluencelabs/cli/commit/049ba1e5519c7f18be3ef4941187ab9a4c0e0b6d))

## [0.12.3](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.12.2...fluence-cli-v0.12.3) (2023-11-09)


### Bug Fixes

* update spell and installation-spell ([#611](https://github.com/fluencelabs/cli/issues/611)) ([5bd3563](https://github.com/fluencelabs/cli/commit/5bd35635b0cc9ee750f326ce299adf07506293a1))

## [0.12.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.12.1...fluence-cli-v0.12.2) (2023-11-09)


### Features

* restructure templates [fixes DXJ-526] ([#608](https://github.com/fluencelabs/cli/issues/608)) ([185a905](https://github.com/fluencelabs/cli/commit/185a905838e9b8dbb83348070fa022e087ebed80))
* support env variables to override cli dependencies [fixes DXJ-524] ([#605](https://github.com/fluencelabs/cli/issues/605)) ([0dd52bc](https://github.com/fluencelabs/cli/commit/0dd52bc2c9b672176219ae99bda4ddcf8832111e))

## [0.12.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.12.0...fluence-cli-v0.12.1) (2023-11-05)


### Features

* improve topic descriptions ([#602](https://github.com/fluencelabs/cli/issues/602)) ([20ad8b4](https://github.com/fluencelabs/cli/commit/20ad8b412a7d983ef0b118466997601e67338d10))
* migrate "workers" property in fluence.yaml directly into "deals" and "hosts" properties [fixes DXJ-507] ([#600](https://github.com/fluencelabs/cli/issues/600)) ([4ed38f4](https://github.com/fluencelabs/cli/commit/4ed38f4b8a0288a03bee5e7ca4fea1ff12ec0e51))
* restructure project templates [fixes DXJ-523] ([#604](https://github.com/fluencelabs/cli/issues/604)) ([0fa6fa5](https://github.com/fluencelabs/cli/commit/0fa6fa5cb7ab5f5fbc9e77593b0070892025c52a))
* support flags in add-peer ([#598](https://github.com/fluencelabs/cli/issues/598)) ([d5b6e1e](https://github.com/fluencelabs/cli/commit/d5b6e1e96755b48b1ed0128cfb7c0c6f9bee57ca))


### Bug Fixes

* fix custom env [fixes DXJ-521] ([#601](https://github.com/fluencelabs/cli/issues/601)) ([af04bd0](https://github.com/fluencelabs/cli/commit/af04bd0f76a87b2a4df9cea05e3486ba8cf2de64))

## [0.12.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.11.4...fluence-cli-v0.12.0) (2023-10-30)


### ⚠ BREAKING CHANGES

* **deps:** update dependency @fluencelabs/js-client to v0.4.2

### Features

* allow user to select service from list [fixes DXJ-501] ([#589](https://github.com/fluencelabs/cli/issues/589)) ([428a40c](https://github.com/fluencelabs/cli/commit/428a40c7789205c6b654322fee667be67bbd98bf))
* **deps:** update dependency @fluencelabs/js-client to v0.4.2 ([79985df](https://github.com/fluencelabs/cli/commit/79985df3306dc9aae688f82b15277eeb953f29ce))


### Bug Fixes

* Bump nox to 0.4.0 ([#597](https://github.com/fluencelabs/cli/issues/597)) ([d51d9a7](https://github.com/fluencelabs/cli/commit/d51d9a72b0498e20730527d6cc9c031713a9b858))

## [0.11.4](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.11.3...fluence-cli-v0.11.4) (2023-10-25)


### Features

* update spell template [fixes DXJ-514] ([#587](https://github.com/fluencelabs/cli/issues/587)) ([7560514](https://github.com/fluencelabs/cli/commit/7560514a2dfa852f56eb1771d3538e688d146bb1))


### Bug Fixes

* fix update app cid ([#586](https://github.com/fluencelabs/cli/issues/586)) ([90efcdb](https://github.com/fluencelabs/cli/commit/90efcdb54cd99797050ec7ed80bbc3607b32f065))

## [0.11.3](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.11.2...fluence-cli-v0.11.3) (2023-10-24)


### Features

* add `local logs` [fixes DXJ-513] ([#574](https://github.com/fluencelabs/cli/issues/574)) ([885fce6](https://github.com/fluencelabs/cli/commit/885fce676f6e83046aa89fe6220b783c31dc1444))
* up deal logs and better tests for them ([#560](https://github.com/fluencelabs/cli/issues/560)) ([48a6420](https://github.com/fluencelabs/cli/commit/48a6420cf3802aa940bc94ce79c225cc5e4ffdb2))


### Bug Fixes

* env must not be required when using `--relay` [fixes DXJ-511] ([#570](https://github.com/fluencelabs/cli/issues/570)) ([b8d6c5b](https://github.com/fluencelabs/cli/commit/b8d6c5b9476962805a7fcf6bcc0cfb171089c584))

## [0.11.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.11.1...fluence-cli-v0.11.2) (2023-10-20)


### Features

* add provider config [fixes DXJ-470] ([#470](https://github.com/fluencelabs/cli/issues/470)) ([a4706c5](https://github.com/fluencelabs/cli/commit/a4706c59c4263e6528fe8f45fc4b07c293ce540a))
* use aqua-to-js lib [fixes DXJ-489] ([#517](https://github.com/fluencelabs/cli/issues/517)) ([4b41025](https://github.com/fluencelabs/cli/commit/4b41025d18b417807f6d809873db55c8067f3fa6))


### Bug Fixes

* Disable node warnings when running as standalone ([#536](https://github.com/fluencelabs/cli/issues/536)) ([5834e35](https://github.com/fluencelabs/cli/commit/5834e3572562548efabcb289dc3e74adb2009b46))
* js-client error ([#559](https://github.com/fluencelabs/cli/issues/559)) ([214ad91](https://github.com/fluencelabs/cli/commit/214ad91d2bd46c4d87d7f2a1e3fd61d79a1f4a7a))
* mutable configs initing more then once ([#545](https://github.com/fluencelabs/cli/issues/545)) ([d5e3a65](https://github.com/fluencelabs/cli/commit/d5e3a658d897b216cbab4678da5027f7fa808fa4))

## [0.11.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.11.0...fluence-cli-v0.11.1) (2023-10-12)


### Bug Fixes

* **chore:** Bump version ([#544](https://github.com/fluencelabs/cli/issues/544)) ([b624ecc](https://github.com/fluencelabs/cli/commit/b624eccf106b7f54d7b8fca138fa9b7692ee68d9))
* **docs:** Bump js-client to 0.2.0 in versions.json ([54ec2c3](https://github.com/fluencelabs/cli/commit/54ec2c317444e9c4a139cfcae51a36d824040fb0))

## [0.11.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.10.0...fluence-cli-v0.11.0) (2023-10-11)


### ⚠ BREAKING CHANGES

* update js-client and other dependencies ([#538](https://github.com/fluencelabs/cli/issues/538))

### Features

* update js-client and other dependencies ([#538](https://github.com/fluencelabs/cli/issues/538)) ([fef0b67](https://github.com/fluencelabs/cli/commit/fef0b676b8c49bbc08e807defc73791557003ff0))

## [0.10.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.9.1...fluence-cli-v0.10.0) (2023-10-06)


### ⚠ BREAKING CHANGES

* improve fluence env switching [fixes DXJ-473] ([#502](https://github.com/fluencelabs/cli/issues/502))

### Features

* add aqua imports command [fixes DXJ-483] ([#518](https://github.com/fluencelabs/cli/issues/518)) ([419566a](https://github.com/fluencelabs/cli/commit/419566a1cd033bc7d3a9bbf640b4f4f232d700d5))
* improve fluence env switching [fixes DXJ-473] ([#502](https://github.com/fluencelabs/cli/issues/502)) ([a09f39b](https://github.com/fluencelabs/cli/commit/a09f39b0913799dbd54d0cfc08f755f0ec54c988))
* show dev dependencies [fixes DXJ-492] ([#521](https://github.com/fluencelabs/cli/issues/521)) ([8976225](https://github.com/fluencelabs/cli/commit/8976225919051adae217df569103f3dc9ac0f6f3))


### Bug Fixes

* change rpc ([#523](https://github.com/fluencelabs/cli/issues/523)) ([ddfd48f](https://github.com/fluencelabs/cli/commit/ddfd48f6c4fb1af602b443cd43ebf56a2f7feada))
* change rpc ([#524](https://github.com/fluencelabs/cli/issues/524)) ([8c5ab67](https://github.com/fluencelabs/cli/commit/8c5ab67cc169839b970dc79740a95a4f91f1907c))
* **deps:** update dependency @fluencelabs/aqua-api to v0.12.3 ([#501](https://github.com/fluencelabs/cli/issues/501)) ([2525c44](https://github.com/fluencelabs/cli/commit/2525c443867013b1932532e4fbdeb97ad7a2249a))

## [0.9.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.9.0...fluence-cli-v0.9.1) (2023-09-29)


### Bug Fixes

* fix deal logs ([#506](https://github.com/fluencelabs/cli/issues/506)) ([90a03e7](https://github.com/fluencelabs/cli/commit/90a03e714a49fa90fbf1ed528ab937c0f33e40bd))

## [0.9.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.9...fluence-cli-v0.9.0) (2023-09-28)


### ⚠ BREAKING CHANGES

* update deal to 0.2.16 ([#499](https://github.com/fluencelabs/cli/issues/499))

### Bug Fixes

* **template:** fix duplication in showSubnet ([#500](https://github.com/fluencelabs/cli/issues/500)) ([fda823b](https://github.com/fluencelabs/cli/commit/fda823b18aaa762af9db1c434acb527d2932e0cd))
* update deal to 0.2.16 ([#499](https://github.com/fluencelabs/cli/issues/499)) ([5509f09](https://github.com/fluencelabs/cli/commit/5509f092a35e066d28bf6464e0f1e9d428501a6b))

## [0.8.9](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.8...fluence-cli-v0.8.9) (2023-09-26)


### Features

* add config formatting ([#486](https://github.com/fluencelabs/cli/issues/486)) ([4767406](https://github.com/fluencelabs/cli/commit/4767406b4396908dc72efad0d4bd402d5cad0bec))
* workers remove ([#480](https://github.com/fluencelabs/cli/issues/480)) ([71acd94](https://github.com/fluencelabs/cli/commit/71acd940f5dec0a1988478caecae42adf79bc8fd))


### Bug Fixes

* **deps:** update dependency @fluencelabs/aqua-api to v0.12.2 ([#498](https://github.com/fluencelabs/cli/issues/498)) ([4fcca42](https://github.com/fluencelabs/cli/commit/4fcca42198818643a94ce152af0a03bf1844ebac))

## [0.8.8](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.7...fluence-cli-v0.8.8) (2023-09-25)


### Bug Fixes

* npm not being found when installed with yarn [fixes DXJ-479] ([#484](https://github.com/fluencelabs/cli/issues/484)) ([d0f4b2b](https://github.com/fluencelabs/cli/commit/d0f4b2b153839e19aa2772b86dbfa750690e0e7e))

## [0.8.7](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.6...fluence-cli-v0.8.7) (2023-09-22)


### Features

* use Subnet.resolve ([#481](https://github.com/fluencelabs/cli/issues/481)) ([e13a64b](https://github.com/fluencelabs/cli/commit/e13a64beb0b9646e8739c0e99472584ee68a0de3))

## [0.8.6](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.5...fluence-cli-v0.8.6) (2023-09-22)


### Features

* add `showSubnet` func ([#478](https://github.com/fluencelabs/cli/issues/478)) ([0b5d8d9](https://github.com/fluencelabs/cli/commit/0b5d8d9cce05313f8ddbaa3d2768bf072848ca99))


### Bug Fixes

* deal update ([#483](https://github.com/fluencelabs/cli/issues/483)) ([fed1933](https://github.com/fluencelabs/cli/commit/fed1933d82f4ac763bd8424acc3f95f4e86b45bd))

## [0.8.5](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.4...fluence-cli-v0.8.5) (2023-09-18)


### Features

* format avm errors ([#472](https://github.com/fluencelabs/cli/issues/472)) ([c4a6e2d](https://github.com/fluencelabs/cli/commit/c4a6e2d6b1f5bde72ad38517f3cc15bd03a6ab5f))

## [0.8.4](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.3...fluence-cli-v0.8.4) (2023-09-18)


### Features

* update dependencies ([#475](https://github.com/fluencelabs/cli/issues/475)) ([3ef0c85](https://github.com/fluencelabs/cli/commit/3ef0c85b4856456394a001775358d00a55a2b1af))

## [0.8.3](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.2...fluence-cli-v0.8.3) (2023-09-13)


### Features

* add more red to error messages ([#467](https://github.com/fluencelabs/cli/issues/467)) ([66b66a4](https://github.com/fluencelabs/cli/commit/66b66a4d570dd9b60da4a6c05990460124fb129c))
* use `use` instead of `import` in generated aqua ([#464](https://github.com/fluencelabs/cli/issues/464)) ([76934c7](https://github.com/fluencelabs/cli/commit/76934c764b557bd35e711817e051138141561a06))

## [0.8.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.1...fluence-cli-v0.8.2) (2023-09-12)


### Features

* update dep and pin fluencelabs dep ([#462](https://github.com/fluencelabs/cli/issues/462)) ([4713517](https://github.com/fluencelabs/cli/commit/4713517e3788d06dfd3a049a2529e77d50b72dd6))
* update installation spell ([#466](https://github.com/fluencelabs/cli/issues/466)) ([fe3f806](https://github.com/fluencelabs/cli/commit/fe3f806b65faf392de9c1c700493fbf63a086085))

## [0.8.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.8.0...fluence-cli-v0.8.1) (2023-09-07)


### Features

* try worker deploy multiple ([#452](https://github.com/fluencelabs/cli/issues/452)) ([adae1fb](https://github.com/fluencelabs/cli/commit/adae1fbb6fd05cdec037f72701ee7e4bf17f01ce))
* update dependencies ([#451](https://github.com/fluencelabs/cli/issues/451)) ([76f6dd2](https://github.com/fluencelabs/cli/commit/76f6dd227571cc295e1f306b74c57e696aa14041))

## [0.8.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.7.2...fluence-cli-v0.8.0) (2023-09-07)


### ⚠ BREAKING CHANGES

* add matching and chain networks ([#310](https://github.com/fluencelabs/cli/issues/310))

### Features

* add matching and chain networks ([#310](https://github.com/fluencelabs/cli/issues/310)) ([239bebd](https://github.com/fluencelabs/cli/commit/239bebd03f5b7f32be2383c1aa70117e962a39f3))
* configs without comments by default [fixes DXJ-465] ([#443](https://github.com/fluencelabs/cli/issues/443)) ([73f6bbe](https://github.com/fluencelabs/cli/commit/73f6bbe22e438ffdd738dfa212e15687f41b6b27))
* make docs and examples in the configs optional [fixes DXJ-458] ([#436](https://github.com/fluencelabs/cli/issues/436)) ([6ae4307](https://github.com/fluencelabs/cli/commit/6ae4307c06b88c834a3795a4a2edabc283adb197))
* update dependencies ([#438](https://github.com/fluencelabs/cli/issues/438)) ([84004ae](https://github.com/fluencelabs/cli/commit/84004ae24923af9eca87a6534fb7f357eab5fb31))
* use dummy deal id for workers deploy [fixes DXJ-373] ([#446](https://github.com/fluencelabs/cli/issues/446)) ([8c430a2](https://github.com/fluencelabs/cli/commit/8c430a28e54f50bb6a253678ff1ca5fe993112ae))


### Bug Fixes

* **deps:** update dependency @fluencelabs/js-client to v0.1.1 ([#439](https://github.com/fluencelabs/cli/issues/439)) ([311c0ca](https://github.com/fluencelabs/cli/commit/311c0caac466ce84f7d8d1078b74f949551605fb))

## [0.7.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.7.1...fluence-cli-v0.7.2) (2023-08-28)


### Bug Fixes

* experimental warnings ([#434](https://github.com/fluencelabs/cli/issues/434)) ([3acc43f](https://github.com/fluencelabs/cli/commit/3acc43f362071f7690a717f20be808bade989b14))

## [0.7.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.7.0...fluence-cli-v0.7.1) (2023-08-25)


### Bug Fixes

* Use latest aqua-api ([#432](https://github.com/fluencelabs/cli/issues/432)) ([730bc4f](https://github.com/fluencelabs/cli/commit/730bc4f7b1eecd595de8a4bc538b26c867a8367a))

## [0.7.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.6.2...fluence-cli-v0.7.0) (2023-08-25)


### ⚠ BREAKING CHANGES

* Remove old packages, add new ones ([#424](https://github.com/fluencelabs/cli/issues/424))

### Features

* Remove old packages, add new ones ([#424](https://github.com/fluencelabs/cli/issues/424)) ([875b4fb](https://github.com/fluencelabs/cli/commit/875b4fba082c678a6b95496c2a7959e0e6a34435))
* show aqua compilation error in beforeBuild and other improvements and refactorings ([#429](https://github.com/fluencelabs/cli/issues/429)) ([48d3f73](https://github.com/fluencelabs/cli/commit/48d3f73d603e6cd1881311de183bc19a2a3035c5))

## [0.6.2](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.6.1...fluence-cli-v0.6.2) (2023-08-22)


### Features

* pack CLI [fixes DXJ-443] ([#398](https://github.com/fluencelabs/cli/issues/398)) ([78cdda2](https://github.com/fluencelabs/cli/commit/78cdda2594c280d9165be4cd4a0c4421e417aeb6))
* patch oclif node execution so there are no warnings ([#422](https://github.com/fluencelabs/cli/issues/422)) ([db5d92f](https://github.com/fluencelabs/cli/commit/db5d92fc34f2c161ee97e1e8985c442562af1667))
* use local npm ([#417](https://github.com/fluencelabs/cli/issues/417)) ([a6c62f5](https://github.com/fluencelabs/cli/commit/a6c62f57e7138ef20b9b08193cf734e08691ad3d))


### Bug Fixes

* change description ([#416](https://github.com/fluencelabs/cli/issues/416)) ([4711f7f](https://github.com/fluencelabs/cli/commit/4711f7fb4666767d3731095001c74ff4a918ea32))
* fix worker logs [fixes DXJ-449] ([#418](https://github.com/fluencelabs/cli/issues/418)) ([78521c3](https://github.com/fluencelabs/cli/commit/78521c3bee0ede80373b7a84fa9422f42ac745f4))

## [0.6.1](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.6.0...fluence-cli-v0.6.1) (2023-08-10)


### Bug Fixes

* fix service interface generation [fixes DXJ-445] ([#400](https://github.com/fluencelabs/cli/issues/400)) ([bb104d6](https://github.com/fluencelabs/cli/commit/bb104d6061937a6bca379dbd631b6512605c2c82))

## [0.6.0](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.5.4...fluence-cli-v0.6.0) (2023-08-09)


### ⚠ BREAKING CHANGES

* **deps:** update js-client.api to 0.12.1 and js-client.node to 0.7.1

### Features

* `fluence run` first compile aqua then connect to the network [fixes DXJ-440] ([#387](https://github.com/fluencelabs/cli/issues/387)) ([cf23b52](https://github.com/fluencelabs/cli/commit/cf23b52e9477448805c92a6e81fe7c26a51b6325))
* add READMEs [fixes DXJ-430] ([#375](https://github.com/fluencelabs/cli/issues/375)) ([c86dfb5](https://github.com/fluencelabs/cli/commit/c86dfb59049ac948494cd29de89e6f015a6a8741))
* improve config error messages [fixes DXJ-428] ([#372](https://github.com/fluencelabs/cli/issues/372)) ([cdf732d](https://github.com/fluencelabs/cli/commit/cdf732d1de99f8c07178147304dde69befb5c406))
* improve module new command [fixes DXJ-414] ([#359](https://github.com/fluencelabs/cli/issues/359)) ([52818dd](https://github.com/fluencelabs/cli/commit/52818dd5032557899e335b572af921d57e78111b))
* Leave only workers.yaml, services.aqua, workers.aqua under version control in .fluence dir [fixes DXJ-412] ([#352](https://github.com/fluencelabs/cli/issues/352)) ([c58611d](https://github.com/fluencelabs/cli/commit/c58611d5ed37b375d882d748b2a06b0d5521f78a))
* remove par ([#391](https://github.com/fluencelabs/cli/issues/391)) ([722ddfa](https://github.com/fluencelabs/cli/commit/722ddfab8b9ae696c43dc0ea9dd582d85e1fedc2))
* show dependency override warnings only in `dep v` command [fixes DXJ-427] ([#371](https://github.com/fluencelabs/cli/issues/371)) ([d84800d](https://github.com/fluencelabs/cli/commit/d84800d706ccbc5bf8839073cf483cdafe89977c))
* support cargo args for marine build [fixes DXJ-418] ([#360](https://github.com/fluencelabs/cli/issues/360)) ([edb5ed7](https://github.com/fluencelabs/cli/commit/edb5ed74a210af847b8c96630489deb931bab68f))
* update aqua ([#361](https://github.com/fluencelabs/cli/issues/361)) ([b8dc50c](https://github.com/fluencelabs/cli/commit/b8dc50c5e247245c640fcbb1d01200b55e2e3406))
* update aqua interfaces of the services that cli builds, improve config comments [fixes DXJ-435] ([#380](https://github.com/fluencelabs/cli/issues/380)) ([a34d162](https://github.com/fluencelabs/cli/commit/a34d1624625715f2a2ac73f48b4068fa0af42185))
* update dependencies ([#374](https://github.com/fluencelabs/cli/issues/374)) ([fe7feee](https://github.com/fluencelabs/cli/commit/fe7feeee4d317d9e9610acd9365571e12ee38851))


### Bug Fixes

* **deps:** update dependency @fluencelabs/air-beautify-wasm to v0.3.1 ([#355](https://github.com/fluencelabs/cli/issues/355)) ([94011ab](https://github.com/fluencelabs/cli/commit/94011ab90682e6a94bc1cc2b63ece69172cffc5c))
* **deps:** update dependency @fluencelabs/air-beautify-wasm to v0.3.2 ([#381](https://github.com/fluencelabs/cli/issues/381)) ([a69890e](https://github.com/fluencelabs/cli/commit/a69890ed04c6958d542006755ddc78d4c84b6438))
* **deps:** update js-client.api to 0.12.1 and js-client.node to 0.7.1 ([9309ffa](https://github.com/fluencelabs/cli/commit/9309ffa930c8ecb9bc3ad9bbba3d54e990964a30))
* don't ask to update if already up to date on the latest version [fixes DXJ-411] ([#357](https://github.com/fluencelabs/cli/issues/357)) ([a35e53d](https://github.com/fluencelabs/cli/commit/a35e53d98e39408d54792e511ac32fd2a75ed7db))
* fix spell new --path not working [fixes DXJ-419] ([#370](https://github.com/fluencelabs/cli/issues/370)) ([c5cd522](https://github.com/fluencelabs/cli/commit/c5cd5223a0aa42369603ff35cd55d4bb29b51512))
* log info messages and warnings to stderr [fixes DXJ-416] ([#358](https://github.com/fluencelabs/cli/issues/358)) ([6156b56](https://github.com/fluencelabs/cli/commit/6156b5619d067a8888fa75f455683eb50f410696))

## [0.5.4](https://github.com/fluencelabs/cli/compare/fluence-cli-v0.5.3...fluence-cli-v0.5.4) (2023-07-14)


### Features

* `fluence deal deploy --no-input` to update deal without asking [DXJ-410] ([#328](https://github.com/fluencelabs/cli/issues/328)) ([f35ccc6](https://github.com/fluencelabs/cli/commit/f35ccc6a9cbd8f0c728cfd9300ea1fc12484855b))
* add examples and comments to configs [DXJ-334] ([#327](https://github.com/fluencelabs/cli/issues/327)) ([09d28d6](https://github.com/fluencelabs/cli/commit/09d28d66e66990ac6a59e263111b75c918b3054e))
* improve ts template [DXJ-405] ([#329](https://github.com/fluencelabs/cli/issues/329)) ([d82e147](https://github.com/fluencelabs/cli/commit/d82e1473f08b1352819afe3a78a5292030b4ea35))
* remove legacy deploy remains ([#349](https://github.com/fluencelabs/cli/issues/349)) ([82171cb](https://github.com/fluencelabs/cli/commit/82171cb6fffb1a22bb6256b8154e8522170c2148))
* rename cli back ([#350](https://github.com/fluencelabs/cli/issues/350)) ([42ef863](https://github.com/fluencelabs/cli/commit/42ef86318e451057f69d546a1ed24e063fe7aaad))
* rename to flox [DXJ-381] ([#298](https://github.com/fluencelabs/cli/issues/298)) ([ff5bd0d](https://github.com/fluencelabs/cli/commit/ff5bd0d0d7c17814fbef1148f6e0fc911a4f9eeb))


### Bug Fixes

* **deps:** update dependency ipfs-http-client to v60.0.1 ([#335](https://github.com/fluencelabs/cli/issues/335)) ([97a4d5b](https://github.com/fluencelabs/cli/commit/97a4d5b8359555e844828a4f5ddfeeeb4fccd941))
* **deps:** update dependency semver to v7.5.4 ([#336](https://github.com/fluencelabs/cli/issues/336)) ([56dcb3b](https://github.com/fluencelabs/cli/commit/56dcb3b2210bf0a4c81fde9d18ac712973ae66f6))
* skip generating js and ts files instead of throwing for aqua files that don't export anything ([#341](https://github.com/fluencelabs/cli/issues/341)) ([6fdeb4e](https://github.com/fluencelabs/cli/commit/6fdeb4e23625fae2f4ce9d9b2bbddc1a032f0f47))

## [0.5.3](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.5.2...fluence-cli-v0.5.3) (2023-07-05)


### Features

* print default dependencies and their versions when using `default` flag [fixes DXJ-398] ([#316](https://github.com/fluencelabs/fluence-cli/issues/316)) ([6f22700](https://github.com/fluencelabs/fluence-cli/commit/6f22700c67b15e8219dd5af0da0d6106850ad414))
* update dependencies ([#320](https://github.com/fluencelabs/fluence-cli/issues/320)) ([f11224e](https://github.com/fluencelabs/fluence-cli/commit/f11224ed1f812a07f065772879ea7fd22af2f400))

## [0.5.2](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.5.1...fluence-cli-v0.5.2) (2023-07-04)


### Features

* do not remove output dir when compiling aqua [fixes DXJ-403] ([#318](https://github.com/fluencelabs/fluence-cli/issues/318)) ([8decf46](https://github.com/fluencelabs/fluence-cli/commit/8decf464f46ed8057dac44324c5beb60711500ff))
* improve cli output when building project [fixes DXJ-406] ([#317](https://github.com/fluencelabs/fluence-cli/issues/317)) ([1da1fb0](https://github.com/fluencelabs/fluence-cli/commit/1da1fb058137e067723d8ee2ef5a7911c15bef36))

## [0.5.1](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.5.0...fluence-cli-v0.5.1) (2023-07-03)


### Features

* update some remaining node16 mentions and pin dependencies ([#314](https://github.com/fluencelabs/fluence-cli/issues/314)) ([ce25a71](https://github.com/fluencelabs/fluence-cli/commit/ce25a71ac1b9a72ffd05ce946d1367eca94de46d))

## [0.5.0](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.19...fluence-cli-v0.5.0) (2023-06-30)


### ⚠ BREAKING CHANGES

* **js-client:** update js-client.api to 0.12.0, js-client.node 0.7.0 (https://github.com/fluencelabs/fluence-cli/pull/301)

### Features

* **js-client:** update js-client.api to 0.12.0, js-client.node 0.7.0 (https://github.com/fluencelabs/fluence-cli/pull/301) ([1eb87a2](https://github.com/fluencelabs/fluence-cli/commit/1eb87a24d2e97a33fca9cebd1357207da5b876fd))

## [0.4.19](https://github.com/fluencelabs/fluence-cli/compare/fluence-cli-v0.4.18...fluence-cli-v0.4.19) (2023-06-29)


### Features

* Add quickstart template [fixes DXJ-399] ([#306](https://github.com/fluencelabs/fluence-cli/issues/306)) ([7cb925e](https://github.com/fluencelabs/fluence-cli/commit/7cb925ef6ab6152abb36905449aba79987f0695a))
* recursive aqua file compilation [fixes DXJ-400] ([#311](https://github.com/fluencelabs/fluence-cli/issues/311)) ([3bb3720](https://github.com/fluencelabs/fluence-cli/commit/3bb3720c27b15c65f8bdf9bee2167ebbee377ef6))
* use binary marine and mrepl releases for linux x86_64 and darwin x86_64 [fixes DXJ-121, DXJ-147] ([#307](https://github.com/fluencelabs/fluence-cli/issues/307)) ([a5180b4](https://github.com/fluencelabs/fluence-cli/commit/a5180b43c6acff1aa054cc30bc6a1754075dfcdc))

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
