# Mockserver data generator local canary

Date: 2026-09-04

Status: passed on local macOS for OData V2, OData V4, and CDS-through-FE.

## Candidate

- Dev-kit fingerprint: d2b4efc156bdfd82b3d46850963881d677e81dbe38f60e4b98fc4eb9f30da847
- Archive SHA-256: 475b37f9878594591178a003e698cc077cf81a2e02f14a5792408a240bf79a93
- Archive size: 498,294 bytes
- Archive entries: 9
- Source state: dirty development worktrees, therefore non-reproducible
- Model state: no model weights in the archive; deterministic fallback exercised

## Results

| Fixture                | Metadata endpoint | Entity endpoint        | Rows | Restore |
| ---------------------- | ----------------- | ---------------------- | ---: | ------- |
| OData V2 EDMX          | passed            | Products?$top=1 passed |    1 | exact   |
| OData V4 EDMX          | passed            | Products?$top=1 passed |    1 | exact   |
| CDS metadata processor | passed            | Products?$top=1 passed |    1 | exact   |

Each application resolved the current local tarballs for
@sap-ux/mockserver-data-generator, @sap-ux/fe-mockserver-core, and
@sap-ux/ui5-middleware-fe-mockserver. Each generated configuration contained
exactly one standard sap-fe-mockserver middleware and loaded
@sap-ux/mockserver-data-generator/fe-mockserver.

The V2 and CDS fixtures were restored in the same run. Original package.json,
UI5 YAML, manifest, and metadata files matched byte for byte;
installer-created lock/YAML files were absent afterward. V4 was verified with
the same transactional workflow in the preceding local canary.

## Post-review reproducible exact-archive canary

After the production review fixes, the development kit was rebuilt and the
exact resulting archive was installed into a fresh disposable OData V4 Fiori
application:

- Dev-kit fingerprint: `9c23b16c4affe20169a0a562236c46d768c02ebaf5a4734af633bb82dc03ad6b`
- Archive SHA-256: `46d18e063c895609a0d8f3de3293cfa88e21a9e786cd90fb43e89cb0b64f7a84`
- Archive size: 510,549 bytes
- Generator tarball: 49,045 bytes, SHA-256 `47f1322ae06690c7079317d6df31d396f7a9d45961043fccf07104c2935b5f98`
- Source state: clean `SAP/open-ux-tools` commit `56cc290e4105875544bbe7742efef48a2791bfbf` and clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible
- Installed verification: one standard middleware and the expected conditional provider export
- HTTP verification: OData V4 `$metadata` passed, `Products?$top=1` returned one row, and the host's provider-specific log marker proved that MockGen supplied it rather than the standard fallback
- Restore verification: source files matched the fixture byte for byte, the dependency state reconciled, and `.mockserver-data-generator-dev` was removed

This rerun binds the final local canary to committed source and exact package
contents. The earlier three-format run remains the cross-format fixture
evidence.

## Classifier/SFT production-candidate archive

After the generated-data cache, EDMX complex-property compatibility, numeric
facet guard, and frozen realism campaign landed, the kit was rebuilt from both
clean feature worktrees and installed into another fresh OData V4 fixture:

- Dev-kit fingerprint: `f5efd7eda59426d6b7a1c060de861984d2c120c1e561f8d46f6ad3d65cd31181`
- Archive SHA-256: `9391bc9fddd0ef7f163cd32f3a7017a94f2aaa6910d5cb51f0c042c884c2138a`
- Archive size: 515,411 bytes
- Generator tarball: 53,842 bytes, SHA-256 `56c665256bd743400b1027c54336f8de459107df1c1e9cd6048085345e2fe24f`
- Source state: clean `SAP/open-ux-tools` commit `fd142d5b5675159a251e72253aaeb1905ca302dc` and clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible
- Installed configuration: unchanged `start-mock`, exactly one `sap-fe-mockserver`, and provider `@sap-ux/mockserver-data-generator/fe-mockserver`
- HTTP verification: the provider executed, OData V4 `$metadata` passed, and `Products?$top=1` returned one row

This exact archive contains code and matching host packages but no model
weights. It verifies the transport and deterministic fallback used before a
developer explicitly prepares the classifier/SFT model cache.

## Model-cache CLI archive canary

After adding explicit classifier/SFT artifact preparation and offline
verification, the kit was rebuilt from both clean feature worktrees and
installed into a fresh disposable OData V4 application:

- Dev-kit fingerprint: `98c741313f6d7dd39641317f6961c106c828d04ac24df768dbcf3cbd5192dff0`
- Archive SHA-256: `d3c8d2ebf471dc44da48475b897059d87f9100de99d2b3c9a65ebcb321b8ea52`
- Archive size: 518,745 bytes
- Generator tarball: 56,679 bytes, SHA-256 `779b98c5aca36c3379d80ce8be489508087c0606a92af47cf3e203af2d97a512`
- Source state: clean `SAP/open-ux-tools` commit `1cb3266b15b2258cd95dc15dd4b40fb74e2fe7dd` and clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible
- Installed verification: exactly one standard middleware and provider `@sap-ux/mockserver-data-generator/fe-mockserver`
- HTTP verification: the provider executed, OData V4 `$metadata` passed, and `Products?$top=1` returned one row
- CLI verification: the installed `node_modules/.bin/mockserver-data-generator` executable resolved from the packed tarball and printed the `prepare` and network-free `verify` commands
- Restore verification: installer-owned files matched the original fixture byte for byte and the recovery directory was removed

The archive still contains no model manifest, ONNX runtime, or model weights.
The default HTTP canary therefore remains a deterministic package-wiring check;
learned-path readiness requires an explicitly prepared production-format
manifest plus the exact runtime it pins.

## Retained-pilot classifier/SFT clean-archive canary

The retained pilot bridge and learned installer were then built from clean
feature worktrees and exercised from the exact extracted archive against fresh
OData V2, OData V4, and CDS-through-FE fixtures:

- Dev-kit fingerprint: `86ab039f80a08e97d94dae2688a5522033d65029945256b8d8f7280ece876d0f`
- Archive SHA-256: `0d2fbde7d2bf1e856fcc0b4245440b82623f58373c71db793b07c64d68c6b806`
- Archive size: 524,239 bytes; 10 entries
- Generator tarball: 56,755 bytes, SHA-256 `493afda0eb26b8784603abbca8b34be195e0a00f4e497b98d6e07fc3bc8dba49`
- Source state: clean `SAP/open-ux-tools` commit `b7ecf97ea7cc5a494ddd7ded09f2404771cfb373` and clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible
- Model bridge: revision `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5`, manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`, and 192,167,584 verified cache bytes
- Runtime installation: exact saved dependency `onnxruntime-node@1.24.3`
- Installed configuration: unchanged `start-mock`, exactly one `sap-fe-mockserver`, provider `@sap-ux/mockserver-data-generator/fe-mockserver`, and explicit offline manifest/cache paths
- Learned verification: the packaged CLI reported classifier and SFT ready in all three fixtures; every HTTP canary reported `providerExecuted: true` and `learnedRuntimeVerified: true`; each `Products?$top=1` endpoint returned one row
- Cache safety: the temporary learned-canary YAML disabled generated-row reuse so an existing global cache could not be mistaken for live classifier/SFT readiness; the application YAML was not changed by this verification step
- Restore verification: all three fixtures matched byte for byte outside disposable `node_modules`, and every `.mockserver-data-generator-dev` directory was removed

The archive contains the package code and model-free bridge, but no model
weights, manifest, native runtime, training data, or judge output. The retained
pilot was supplied explicitly as a local development input.

## Reload and installer-recovery archive canary

The portable kit was rebuilt after reload-cancellation hardening and a
transactional installer recovery fix, then installed from the exact archive
into a disposable generated-style OData V2 application:

- Dev-kit fingerprint: `22000e2049bbcedb983c5c63d369f062b365e1a394df8781990517ef115d9fbd`
- Archive SHA-256: `a74ee1e7acb50b8208b1064a5660f6adc8fa20a416a35b9a7922afea8f4761c6`
- Archive size: 524,898 bytes; 10 entries
- Generator tarball: 57,460 bytes, SHA-256 `34257b290d90a235fd7c24cea10e0c397c5bed38f773c939d3ff4efdac57a76b`
- Source state: clean `SAP/open-ux-tools` commit `40ceed8049b48bb4e46a9c80c2ed9e893efb96f8`; clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible source state
- Installed dependencies: the first installation added 93 packages, including the exact local kit packages and the fixture's public UI5 CLI dependency
- Installed configuration: unchanged `start-mock`, exactly one `sap-fe-mockserver`, and provider `@sap-ux/mockserver-data-generator/fe-mockserver`
- HTTP verification: provider-specific host evidence was present; OData V2 `$metadata` passed; `Products?$top=1` returned one row
- Model bridge: revision `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5`, manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`, and 192,167,584 verified cache bytes
- Learned runtime: exact `onnxruntime-node@1.24.3`; the second installation added 21 packages
- Learned verification: the packaged CLI reported both components ready; the HTTP canary reported `providerExecuted: true` and `learnedRuntimeVerified: true`; `Products?$top=1` returned one row with generated-data cache disabled for the canary
- Restore verification: both the deterministic and learned runs restored application files byte for byte outside disposable `node_modules`, and `.mockserver-data-generator-dev` was absent

An initial run against an obsolete sample dependency correctly failed package
installation and restored the application files, but exposed that a later
`--restore` could not retry dependency reconciliation from a `rolled-back`
journal. Commit `40ceed804` makes that state dependency-only recovery; the
development-kit integration suite now covers the failure and retry path.

## Current repeat-install and upgrade archive canary

The installer was hardened so that installing a newer local kit preserves both
the application's last working MockGen configuration and its exact staged
package bytes if the upgrade fails. A fresh kit was built from clean feature
worktrees and exercised by installing the preceding archive, upgrading in
place, testing the retained classifier/SFT path, and finally restoring the
original application:

- Dev-kit fingerprint: `62cb961976060a2b0a31cb35003519150fcd6873a976720e971bf4fb8d6117dc`
- Archive SHA-256: `401913cc38854ecffbf5de82995e784aec12e983719fb6bf97ec6313cb3e527b`
- Archive size: 525,054 bytes; 10 entries
- Generator tarball: 57,460 bytes, SHA-256 `34257b290d90a235fd7c24cea10e0c397c5bed38f773c939d3ff4efdac57a76b`
- Core tarball: 157,191 bytes, SHA-256 `e7b12e990905fe5afbbbb5817bbf4eac94a9d3278d505c7692ef7f2c9eb546e9`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `041d8ecfdca0666135bbaca6147ed76d8b57bea1`; clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible source state
- Upgrade verification: the exact `22000e2049bbcedb` archive was installed first; the current archive then upgraded the same generated-style OData V2 application, adding one package and changing one package
- Installed configuration: the upgrade retained one `sap-fe-mockserver`, one `ui5-mock.yaml`, the existing `start-mock` flow, and provider `@sap-ux/mockserver-data-generator/fe-mockserver`
- HTTP verification: provider-specific host evidence was present before and after the upgrade; OData V2 `$metadata` passed and `Products?$top=1` returned one row after both installations
- Learned verification: the retained manifest SHA-256 remained `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; exact `onnxruntime-node@1.24.3` installation added 21 packages; classifier and SFT were ready; the canary reported `providerExecuted: true` and `learnedRuntimeVerified: true`
- Restore verification: after both the deterministic upgrade and the learned installation, application files matched the pristine fixture byte for byte outside disposable `node_modules`, and `.mockserver-data-generator-dev` was absent
- Failure verification: the integration suite covers a failed upgrade, failed automatic dependency rollback, explicit recovery, content-addressed package preservation, and restoration to the original pre-MockGen state; all 48 tests pass

The handoff copy of this exact archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-62cb961976060a2b.tgz`.

## Current production-config and decoder archive canary

The kit was rebuilt after the constrained-decoder optimization, full compiled
build/evaluation binding, frozen-cohort enforcement, and production generation
config unification. Its bundled retained-pilot bridge now has a regression that
executes the independently bundled file and creates a verified model cache.

- Dev-kit fingerprint: `22606ad3af28117e355e679fc4d97eeee69e27ccdf8d38f01b2e6faaad1e84ef`
- Archive SHA-256: `266465e4fc25367e9846b8359f8ae2ec550dcc73a52e5bf3520e82da5a29f916`
- Archive size: 526,031 bytes; 10 entries
- Generator tarball: 58,273 bytes, SHA-256 `a71d2534476e739d0da991362a5b9d2c7940a6518308915ba813b37539201e71`
- Source state: clean `SAP/open-ux-tools` commit `900f54a1bd230f578109a414d4c3f202a6d25171`; clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible source state
- Extracted bridge: real retained classifier/SFT assets produced revision `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5`, manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`, and 192,167,584 verified cache bytes
- Installed configuration: unchanged `start-mock`, exactly one `sap-fe-mockserver`, and provider `@sap-ux/mockserver-data-generator/fe-mockserver`
- Learned verification: both model components were ready; the OData V2 HTTP canary reported `providerExecuted: true` and `learnedRuntimeVerified: true`; `$metadata` passed and `Products?$top=1` returned one row
- Restore verification: application files matched the pristine fixture byte for byte outside disposable `node_modules`, and `.mockserver-data-generator-dev` was removed

The handoff copy of this exact current archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-22606ad3af28117e.tgz`.
Its checksum must be verified before extraction. The prior archive remains the
upgrade-source fixture; this current archive supersedes it for new local or BAS
testing.

## Current cache-hardening archive canary

The kit was rebuilt after cross-process model-cache fencing, late-cancellation
publication protection, and the 200 MiB preview/stable manifest ceiling landed.
The exact extracted archive was installed into a fresh OData V4 fixture first
without a model and then with an independently staged retained-pilot cache.

- Dev-kit fingerprint: `fabc0de4a8579c742acc80c4f5e9629775af9818ad3b051fb750bca8d5e775ee`
- Archive SHA-256: `ed78cfd292d7fd5057324ef56406628b794b226f2935eca8fcb00c38f5e2b520`
- Archive size: 527,420 bytes; 10 entries
- Generator tarball: 59,810 bytes, SHA-256 `a248f697af41a0504cfe12c9a734c9d4653d38d457dd0604d75839334dc6ff59`
- Source state: clean `SAP/open-ux-tools` commit `4c3b6bd9a19f84dfc9fda86f6e2e7eaca84ab10d` and clean `SAP/open-ux-odata` commit `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`; reproducible
- Deterministic verification: exactly one `sap-fe-mockserver`, provider `@sap-ux/mockserver-data-generator/fe-mockserver`, provider-specific execution evidence, successful OData V4 `$metadata`, and one `Products?$top=1` row
- Model bridge: development lifecycle, revision `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5`, manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`, and 192,167,584 verified cache bytes
- Learned verification: exact `onnxruntime-node@1.24.3`; both classifier and SFT components ready; `modelVerified: true`; `learnedRuntimeVerified: true`; successful OData V4 `$metadata`; and one `Products?$top=1` row
- Restore verification: the fixture matched its original files byte for byte outside disposable `node_modules`, and the installer recovery directory was removed

The handoff copy of this exact current archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-fabc0de4a8579c74.tgz`.
Its checksum must be verified before extraction. This canary supersedes the
preceding archive for new local or BAS testing; the earlier records remain
historical cross-format and upgrade evidence.

## Current integrated-performance archive canary

The kit was rebuilt after adding monotonic provider/host timing evidence and the
fingerprinted Fiori integration-performance harness. Its exact extracted
archive installed into a fresh OData V4 fixture with the real retained
classifier and INT8 SFT cache, completed the learned HTTP canary, ran the full
five-sample campaign, and restored the fixture byte for byte outside disposable
`node_modules`.

- Dev-kit fingerprint: `374c1611f8eb76ded0647ecfceb84e10edb29902bee178465955f5626e939afc`
- Archive SHA-256: `7729156a88d41e7fd35729deea456fd43f57c6c705d930b7599001729396feab`
- Archive size: 528,436 bytes; 10 entries
- Generator tarball: 59,993 bytes, SHA-256 `3b5af462486b55bc3c412985f0e28064c783328cac5fc4c5c52f59d0d155a9f2`
- Core tarball: 157,295 bytes, SHA-256 `6036648c586e90da5aa206da63c7f5b2fd5eaa29c68a5e5582f1e08ebee4969b`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `d9d813261b5a8a79761657a9505014c67fc50648` and clean `SAP/open-ux-odata` commit `64e37ac4a6d24607c28a06242075b95afbbc1ff2`; reproducible
- Learned HTTP verification: classifier and SFT ready; provider executed; OData V4 `$metadata` passed; `Products?$top=1` returned one row; initial cold host duration was 2,933.717 ms
- Integrated performance: five cold whole-service samples had 3,437.153 ms p95; five fresh-process cache hits had 25.306 ms p95 and did not initialize the model; five first-use acquisitions had 1,308.731 ms p95
- Restore verification: the fixture matched the source fixture byte for byte outside disposable `node_modules`, and `.mockserver-data-generator-dev` was absent

The handoff archive for this integrated-performance checkpoint is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-374c1611f8eb76de.tgz`.
Its checksum must be verified before extraction. This archive supersedes the
preceding cache-hardening archive for new local or BAS testing.

## Current coherence-enabled archive canary

The kit was rebuilt from clean worktrees after the production semantic
coherence layer and executable final-cohort gate landed. Its exact extracted
archive installed into a fresh OData V4 fixture with the retained classifier
and INT8 SFT cache, completed the learned HTTP canary, and restored the fixture
byte-for-byte outside disposable `node_modules`.

- Dev-kit fingerprint: `87e3f13ff4dbf47779c0991d6d710437c49c9fb37be4482be217f307b44abf90`
- Archive SHA-256: `8843c89710f7e2dcadddb1a11041ecdd54d11533a39d31ff70e48dc4ff0abf68`
- Archive size: 531,504 bytes; 10 entries
- Generator tarball: 63,024 bytes, SHA-256 `8b617b06e2f1b94d99e4646055aafff277dd77d4f242e51fcfa03d5118b15c26`
- Core tarball: 157,298 bytes, SHA-256 `94ecda7806d18d7b73e2e24f28418bc05440ddc4e8567d712c17d4a16e0a05bc`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `976a6e3b82046134aaa3f3d9ed55bd62a00eff82` and clean `SAP/open-ux-odata` commit `64e37ac4a6d24607c28a06242075b95afbbc1ff2`; reproducible
- Learned verification: retained manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; exact `onnxruntime-node@1.24.3`; classifier and SFT ready; `providerExecuted: true`; `learnedRuntimeVerified: true`
- HTTP verification: OData V4 `$metadata` passed and `Products?$top=1` returned one row through exactly one `sap-fe-mockserver`
- Observed one-run timing: 3,416.661 ms model initialization; 7,610.522 ms whole-service generation; 7,611.491 ms host provider duration. These are canary observations, not the five-sample performance report.
- Restore verification: the application matched the pristine fixture byte-for-byte outside `node_modules`, and `.mockserver-data-generator-dev` was absent

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-87e3f13ff4dbf477.tgz`.
Its checksum must be verified before extraction. This archive supersedes the
integrated-performance archive for new local or BAS functional testing; the
older archive and bound five-sample reports remain the current performance
evidence until that campaign is rerun on a supported release platform.

## Current parser-aligned archive canary

After correcting the workspace lockfile so tests and downstream consumers use
the same declared `fast-xml-parser@5.10.1`, the package was rebuilt from a clean
commit, its six-service realism cohort was replayed twice, and the exact new kit
was installed into a fresh OData V2 fixture with the retained classifier and
INT8 SFT cache.

- Dev-kit fingerprint: `f9a0de8fc01b547be338dd852ca68785ed65810cc484a81d0197e4715c5c6e82`
- Archive SHA-256: `2cc3741f355ddab1076618d706834f133b7905c5ad5b8350ab1bf7ebb239d6a8`
- Archive size: 535,912 bytes; 10 entries
- Generator tarball: 67,487 bytes, SHA-256 `fb1e6a9cc6fb353c891cc56d5c0cba22681238946fa8d4c45d86443a6ec9812c`
- Core tarball: 157,298 bytes, SHA-256 `94ecda7806d18d7b73e2e24f28418bc05440ddc4e8567d712c17d4a16e0a05bc`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `8255d109a619714364e0e0d7f78f444e749a3c54` and clean `SAP/open-ux-odata` commit `64e37ac4a6d24607c28a06242075b95afbbc1ff2`; reproducible
- Learned verification: classifier and SFT ready; `providerExecuted: true`; `learnedRuntimeVerified: true`
- HTTP verification: OData V2 `$metadata` passed and `Products?$top=1` returned one row through exactly one `sap-fe-mockserver`
- Observed timing: 1,485.674 ms model initialization; 2,688.299 ms whole-service generation; 2,689.124 ms host provider duration
- Restore verification: the application matched the pristine fixture byte-for-byte outside `node_modules`, and `.mockserver-data-generator-dev` was absent

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-f9a0de8fc01b547b.tgz`.
Its checksum must be verified before extraction. It supersedes earlier archives
for local or BAS functional testing; the older bound five-sample report remains
the performance evidence until the supported release-platform campaign runs.

## Current safe-diagnostics archive canary

The kit was rebuilt after adding product-level degradation coverage, a
package-scoped parser override, privacy-safe local support summaries, and the
published troubleshooting guide. The exact archive was installed into a fresh
OData V2 fixture with the retained classifier and INT8 SFT cache.

- Dev-kit fingerprint: `f7820bacc74174b3b47cc5ca53f8cec22ff17e07184778710b4997a7ddb0e0cd`
- Archive SHA-256: `e5e3ddeeab01daea4c120bdd8e59aededcc57280b14c0078251d2a7b8fab9b97`
- Archive size: 542,926 bytes; 10 entries
- Generator tarball: 74,500 bytes, SHA-256 `3e4713f6d1c4501a6049653c9d8f974c6e38ea8bfc4b6eff0c1b8ce56340bfe2`
- Core tarball: 157,298 bytes, SHA-256 `94ecda7806d18d7b73e2e24f28418bc05440ddc4e8567d712c17d4a16e0a05bc`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `817382b88f2cd88a84eb093410ad2a3a367b5505` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`; reproducible
- Model bridge: revision `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5`, manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`, and 192,167,584 verified cache bytes
- Installed workflow: unchanged `start-mock`, exactly one `sap-fe-mockserver`, provider `@sap-ux/mockserver-data-generator/fe-mockserver`, and exact `onnxruntime-node@1.24.3`
- Learned verification: classifier and SFT ready; `providerExecuted: true`; `learnedRuntimeVerified: true`
- HTTP verification: OData V2 `$metadata` passed and `Products?$top=1` returned one row
- Observed timing: 1,437.508 ms model initialization; 2,635.900 ms whole-service generation; 2,636.680 ms host provider duration
- Restore verification: the application matched the pristine fixture byte-for-byte outside `node_modules`, and `.mockserver-data-generator-dev` was absent
- Portable-path verification: the exact archive also completed a real npm install, deterministic provider/HTTP canary, and byte-exact restore when both the kit and Fiori application paths contained spaces and non-ASCII German/Japanese text; generation took 25.763 ms and the host provider took 26.565 ms

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-f7820bacc74174b3.tgz`.
Its checksum must be verified before extraction. It supersedes the
parser-aligned archive for new local or BAS functional testing. The disposable
canary fixture and copied model cache were removed after exact restore
verification.

## Current metadata-boundary archive canary

After the fixed 32 MiB UTF-8 metadata ceiling landed, the kit was rebuilt from
both clean worktrees. The exact archive completed separate deterministic OData
V4 and retained-model OData V2 installs, HTTP canaries, and restores.

- Dev-kit fingerprint: `e502705429c5c09c8714f677ca2d73d5e23448345362d86f89beb0fb7f807652`
- Archive SHA-256: `d1b85404cb9e052a77a95eb1a1b10072fb4f9a1f635ff5f4b4cf3fa82881df37`
- Archive size: 544,369 bytes; 10 entries
- Generator tarball: 75,878 bytes, SHA-256 `7ef225f8e4443ea3804669e04181fb5642a716ecbb94679df312d05c23c0fb36`
- Core tarball: 157,294 bytes, SHA-256 `d7b95b422d45905aeb5b71db112ad1cd28f4bf7936c2aa8209fc06ec75f6ba03`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `3d2e64c16ea14beb2fc180df2e63bdfa5de1df1f` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`; reproducible
- Deterministic verification: a real 614-package install produced exactly one `sap-fe-mockserver`; the provider executed; OData V4 `$metadata` passed; `Products?$top=1` returned one row; generation took 28.227 ms and the host provider took 29.217 ms
- Learned verification: the retained manifest SHA-256 was `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; exact `onnxruntime-node@1.24.3`; both classifier and SFT ready; `providerExecuted: true`; `learnedRuntimeVerified: true`; OData V2 `$metadata` passed; and `Products?$top=1` returned one row
- Learned timing: 1,506.964 ms runtime initialization; 2,745.367 ms whole-service generation; 2,746.204 ms host provider duration
- Restore verification: both application fixtures matched their original source files byte for byte; generated YAML and recovery directories were absent; both disposable applications and the copied 192,167,584-byte model cache were removed

The metadata-boundary handoff archive was
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-e502705429c5c09c.tgz`.
It is retained as historical evidence and is superseded by the generated-result
boundary archive below.

## Current generated-result-boundary archive canary

After the generator gained the same fixed 64 MiB UTF-8 aggregate result ceiling
as the standard FE host, the development kit was
rebuilt from clean worktrees. The exact archive completed separate deterministic
OData V4 and retained-model OData V2 installs, HTTP canaries, and restores.

- Dev-kit fingerprint: `87c95ffaea3fee278cdacccfaf42cd6060459727a1f24fbd5b011a5088817706`
- Archive SHA-256: `038dce4c144c8c154306fb93cd288dc9af1da93092c800ed0db1f86826761740`
- Archive size: 545,383 bytes; 10 entries
- Generator tarball: 76,855 bytes, SHA-256 `ef649a53e91411c8ce235131a600c921325f8c79ecbc4b0987d8519c72af0519`
- Core tarball: 157,298 bytes, SHA-256 `bac3b001f277d090e807f7864bffb2fb392a0f65cc85ab158be36ef912727509`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `88e0f6b878e02cbd7e92c6de96ab23c57c5de9f0` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`; reproducible
- Deterministic verification: a real 614-package install produced exactly one `sap-fe-mockserver`; the provider executed; OData V4 `$metadata` passed; `Products?$top=1` returned one row; the verified generated-data cache path took 18.502 ms and the host provider took 19.352 ms
- Learned verification: a real 635-package install used exact `onnxruntime-node@1.24.3`; retained manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; both classifier and SFT were ready; `providerExecuted: true`; `learnedRuntimeVerified: true`; OData V2 `$metadata` passed; and `Products?$top=1` returned one row
- Learned timing: 1,412.620 ms runtime initialization; 2,623.729 ms whole-service generation; 2,624.564 ms host provider duration
- Restore verification: both application fixtures matched their original source files byte for byte; generated YAML and recovery directories were absent; both disposable applications and the copied 192,167,584-byte model cache were removed

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-87c95ffaea3fee27.tgz`.
Its SHA-256 must be verified before extraction. It supersedes the
metadata-boundary archive for new local or BAS functional testing.

## Current reproducible archive canary

After package-manifest ordering, staging timestamps, and the gzip header were
made deterministic, two complete sequential builds from the same clean source
commits produced byte-identical development-kit archives. The exact handoff
archive then completed separate deterministic OData V4 and retained-model OData
V2 installs, HTTP canaries, and restores.

- Dev-kit fingerprint: `8b62350555c8503c3961afe0d50701fdfb49f58de1be0a8630e20fcf63f8a083`
- Archive SHA-256: `9ccf05dce06a920358966ac82992533b2f0ec6e2d2fa506d3be99bbbf82027a0`
- Archive size: 544,698 bytes; 10 entries
- Reproducibility verification: two clean-source builds in separate output directories had identical fingerprints, package hashes, archive sizes, archive SHA-256 values, and binary contents
- Generator tarball: 76,790 bytes, SHA-256 `5f3717ce7dcd006fabcb95b8add9ffe9b60cef7ec4b4127faa95d1dc135fea55`
- Core tarball: 157,296 bytes, SHA-256 `24877137509f13f4792931444b210313be4bbf273ef1c8fa5655a1e1cebc3251`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `06612eda2a266779a4510ce211c0610d88e71b69` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`; reproducible
- Deterministic verification: a real 614-package install produced exactly one `sap-fe-mockserver`; the provider executed; OData V4 `$metadata` passed; `Products?$top=1` returned one row; the verified generated-data cache path took 16.990 ms and the host provider took 17.777 ms
- Learned verification: a real 635-package install used exact `onnxruntime-node@1.24.3`; retained manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; both classifier and SFT were ready; `modelVerified: true`; `providerExecuted: true`; `learnedRuntimeVerified: true`; OData V2 `$metadata` passed; and `Products?$top=1` returned one row
- Learned timing: 1,378.088 ms runtime initialization; 2,547.669 ms whole-service generation; 2,548.433 ms host provider duration
- Restore verification: both application fixtures matched their original source files byte for byte outside disposable `node_modules`; generated YAML and recovery directories were absent after restore

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-8b62350555c8503c.tgz`.
Its SHA-256 must be verified before extraction. It supersedes the
generated-result-boundary archive for new local or BAS functional testing; the
earlier archives remain historical evidence.

## Current packaged-architecture archive canary

After the consumer architecture document and relative-link package contract
landed, the kit was rebuilt twice from clean source. The packed generator
contained `README.md`, `docs/architecture.md`, `docs/host-contract.md`, and
`docs/troubleshooting.md`; the exact archive completed deterministic OData V4
and retained-model OData V2 installs, HTTP canaries, and restores.

- Dev-kit fingerprint: `d02c59ff9342c4096e1af9ef9cfdbfc0e0adf3f7319e4091c93aecb3871087fd`
- Archive SHA-256: `04c0280023650f0e49ccde4c5d0cd0a2722938e3741f47af59b7225aa48477d2`
- Archive size: 546,693 bytes; 10 entries
- Reproducibility verification: two clean-source builds in separate output directories had identical fingerprints, package hashes, archive sizes, archive SHA-256 values, and binary contents
- Generator tarball: 78,775 bytes, SHA-256 `68ceccacb922c97687416d7f915718241dae82f3f9a8cf60d590586e4d6ca047`
- Core tarball: 157,296 bytes, SHA-256 `24877137509f13f4792931444b210313be4bbf273ef1c8fa5655a1e1cebc3251`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `f9dc534546f9ba17156280d2f116cece2550350a` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`; reproducible
- Package contract: all 31 focused package-boundary tests passed; relative README links remain within the package or use absolute repository URLs; documented schema, semantic, generation, model, and cache layer directions are enforced
- Deterministic verification: a real 614-package install produced exactly one `sap-fe-mockserver`; the provider executed; OData V4 `$metadata` passed; `Products?$top=1` returned one row; the verified generated-data cache path took 16.680 ms and the host provider took 17.425 ms
- Learned verification: a real 635-package install used exact `onnxruntime-node@1.24.3`; retained manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; both classifier and SFT were ready; `modelVerified: true`; `providerExecuted: true`; `learnedRuntimeVerified: true`; OData V2 `$metadata` passed; and `Products?$top=1` returned one row
- Learned timing: 1,606.016 ms runtime initialization; 2,771.970 ms whole-service generation; 2,772.726 ms host provider duration
- Restore verification: both application fixtures matched their original source files byte for byte outside disposable `node_modules`; generated YAML and recovery directories were absent after restore

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-d02c59ff9342c409.tgz`.
Its SHA-256 must be verified before extraction. It supersedes the preceding
reproducible archive for new local or BAS functional testing; the earlier
archives remain historical evidence.

## Security-guidance archive canary

After package security guidance, model-cache descendant fencing, manual secure
redirect handling, and packed-document validation landed, the kit was rebuilt
twice from clean source. The two archives were byte-identical. The exact
handoff archive then completed separate deterministic OData V4 and
retained-model OData V2 installs, HTTP canaries, and restores.

- Dev-kit fingerprint: `47b4dc3ae32e8269b4c666e188d188d9c1286d699499600eed440380285190ec`
- Archive SHA-256: `7dd025eaf82960defff50ed1d0aa4d3ac0b1a6aa788071926d77427407692f65`
- Archive size: 549,814 bytes; 10 entries
- Reproducibility verification: two clean-source builds in separate output directories had identical fingerprints, package hashes, archive sizes, archive SHA-256 values, and binary contents
- Generator tarball: 81,861 bytes, SHA-256 `a2ffbb9c9d2ab2ac078b9b431a93326794ee2b60b633ba0853d9f45aeed1bbbd`
- Core tarball: 157,296 bytes, SHA-256 `24877137509f13f4792931444b210313be4bbf273ef1c8fa5655a1e1cebc3251`
- Middleware tarball: 13,117 bytes, SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Source state: clean `SAP/open-ux-tools` commit `7aeee32044b5edf02be5159ec334f0b1589e934c` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`; reproducible
- Package verification: 23 suites and 196 tests passed with 85.55% statement coverage; build, zero-error lint, formatting, the 67-file packed boundary, and independent review passed
- Deterministic verification: a real 614-package install produced exactly one `sap-fe-mockserver`; the provider executed; OData V4 `$metadata` passed; `Products?$top=1` returned one row; the verified generated-data cache path took 16.738 ms and the host provider took 17.490 ms
- Learned verification: a real 635-package install used exact `onnxruntime-node@1.24.3`; retained manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; both classifier and SFT were ready; `modelVerified: true`; `providerExecuted: true`; `learnedRuntimeVerified: true`; OData V2 `$metadata` passed; and `Products?$top=1` returned one row
- Learned timing: 1,363.187 ms runtime initialization; 2,520.021 ms whole-service generation; 2,520.791 ms host provider duration
- Restore verification: both application fixtures matched their original source files byte for byte outside disposable `node_modules`; generated YAML and recovery directories were absent after restore

The handoff archive for this historical checkpoint is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-47b4dc3ae32e8269.tgz`.
Verify its SHA-256 before extraction. It supersedes the packaged-architecture
archive for new local or BAS functional testing; earlier archives remain
historical evidence.

## Node 24 macOS arm64 qualification

The same exact archive and retained model bundle were exercised on macOS 26.7
arm64 with Node 24.20.0 and pnpm 11.22.0. Node 24 was run from an npm-cached
temporary runtime and was not installed system-wide.

- `@sap-ux/mockserver-data-generator`: 23 suites and 196 tests passed; clean build, zero-error lint, and the 67-file/81,861-byte package boundary passed.
- `@sap-ux/fe-mockserver-core`: 27 suites, 359 tests, and 282 snapshots passed. The two pre-existing Jest open-handle diagnostics remained visible after the passing run.
- `@sap-ux/ui5-middleware-fe-mockserver`: 2 suites and 12 tests passed.
- Deterministic archive verification: a clean 614-package OData V4 install loaded exactly one `sap-fe-mockserver`; the provider executed, metadata passed, one row was returned, cache-hit generation took 16.820 ms, and host provider work took 17.526 ms.
- Learned archive verification: a clean 635-package OData V2 install verified the retained classifier and SFT bundle, reported `modelVerified: true` and `learnedRuntimeVerified: true`, and returned one row. Runtime initialization took 1,586.570 ms, whole-service generation 2,732.794 ms, and host provider work 2,733.526 ms.
- Both Node 24 application copies restored byte-for-byte outside disposable `node_modules`.

This closes only the macOS arm64 Node 24 cell. It does not establish macOS x64,
Linux, Windows, BAS, proxy, or read-only-filesystem compatibility on Node 24.

## Current read-only verification archive

After moving the verifier's temporary debug configuration outside the Fiori
application and correcting its cache-hit evidence check, the development kit
was built twice from the same clean sources. The archives were byte-identical.

- Dev-kit fingerprint: `7e0fccc5a7bf528da54ae298fbb3568d8ed04b791b0b51fc962f3bb55bc58a00`
- Archive SHA-256: `45d4d8537cb1ccd447ffd220aba287f138b07b71b7cd617171fcb31b11a0143d`
- Archive size: 549,919 bytes; 10 entries
- Source state: clean `SAP/open-ux-tools` commit `0441441e190bfab33130a4466c527239c8613648` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- Reproducibility: two clean builds had the same fingerprint, archive size, SHA-256, and binary contents
- Runtime identity: the bundled installer SHA-256 is `f255c067bf915a1ee773803d5ba37832ed07daa18d6bb489bd57e11a8b7b3178`; it and the generator, core, and middleware tarballs are byte-identical to the live read-only canary archive `10cec2edfb027032`
- Dedicated verification: 11 suites and 103 tests passed; TypeScript build, zero-error lint, and formatting passed
- Binary-equivalent archive install: the 614-package OData V4 application contained exactly one `sap-fe-mockserver`; provider discovery, `$metadata`, `Products?$top=1`, and restore passed; the current archive changes only generated README and provenance content relative to that live canary
- Read-only generation: all 12,342 installed application files and directories were made non-writable; the verifier used a temporary configuration outside the project and a writable generated-data cache outside the project; generation took 25.780 ms and the host provider took 26.571 ms
- Read-only cache hit: a second application start reused the external verified cache in 19.045 ms and the host provider took 19.791 ms, without model initialization
- Application immutability: the aggregate SHA-256 over every file checksum and path was `7ca2bb0ea24d463c1e08db0c1e4fb55ac12f84190d26047be646e950573932c7` before and after both starts
- Restore: after write permission was returned solely to the disposable fixture, installer restore matched the original application byte-for-byte outside disposable `node_modules`

The handoff archive for this read-only checkpoint is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-7e0fccc5a7bf528d.tgz`.
Verify the SHA-256 before extraction. It remains the exact read-only evidence;
later archives supersede it for new local and BAS testing.

## Proxy-aware archive canary

After adding lazy environment-proxy support to model acquisition, the
development kit was built twice from the same clean sources. The archives were
byte-identical, and the exact handoff archive passed separate deterministic V4
and retained-classifier/SFT V2 installations.

- Dev-kit fingerprint: `74af647b365069d6fa5cecb21f85bdfff262040653a95efb91f24083d1c73ecb`
- Archive SHA-256: `935257d2bd5c8df2b19af21df3f7af0fab703317fb3dc42e736a4d9c6e93dcaa`
- Archive size: 550,771 bytes; 10 entries
- Source state: clean `SAP/open-ux-tools` commit `912306df4df55103d858f29aad9896583c814337` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- Reproducibility: two clean builds had the same fingerprint, archive size, SHA-256, package hashes, and binary contents
- Generator tarball: 82,560 bytes, SHA-256 `ecfc7831eade7c5242d5eb2bf4ff915219a6107a028defdcf85718183c15d176`
- Host tarballs: core remained 157,296 bytes with SHA-256 `24877137509f13f4792931444b210313be4bbf273ef1c8fa5655a1e1cebc3251`; middleware remained 13,117 bytes with SHA-256 `d8173e78239ce831a165ba7ca938646db92969093f1348dc043d471df4053d93`
- Package verification: 23 suites and 197 tests passed with 85.63% statement coverage; TypeScript build, zero-error lint, formatting, and the 67-file packed boundary passed
- Proxy verification: default model acquisition used one local CONNECT tunnel when `HTTP_PROXY` was configured; the verified warm-cache path remains network-free
- Deterministic verification: a real 615-package V4 install contained exactly one `sap-fe-mockserver`; provider discovery, `$metadata`, `Products?$top=1`, one generated row, and restore passed; the generated-data cache path took 17.098 ms and host provider work took 17.828 ms
- Learned verification: a real 636-package V2 install used exact `onnxruntime-node@1.24.3`; retained manifest SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`; both classifier and SFT were ready; the provider executed; `$metadata` and `Products?$top=1` passed with one row
- Learned timing: 1,359.545 ms runtime initialization; 2,535.986 ms whole-service generation; 2,536.934 ms host provider duration
- Restore verification: both fixtures matched their source files byte for byte outside disposable `node_modules`; generated YAML and recovery directories were absent after restore

The handoff archive for this proxy-aware checkpoint is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-74af647b365069d6.tgz`.
Verify its SHA-256 before extraction. The cache-fix archive below supersedes it
for new local and BAS testing; this record remains the exact proxy-routing
checkpoint.

## Current chunked-SFT cache and footprint canary

The five-sample integrated campaign exposed that the generated-data cache
validator treated raw row/chunk completion attempts as if they were entity
assignments. The production SFT path therefore generated valid rows but could
not publish them for a warm start. A failing unit regression reproduced the
10-attempt/one-assignment case before the validator was corrected. The exact
fixed package then passed the full package suite, a learned V4 HTTP canary, the
cold/warm/acquisition campaign, a full classifier/SFT evaluation with replay,
and an enforced footprint run.

- Dev-kit fingerprint: `3a16a758a6e582080b7769dc34c884dab85f5dad00dfc17ff3b80459e392b774`
- Archive SHA-256: `cb2a72cc2973631cda6d2f00b2bf810b634c5d720750b816d932618ec7281db1`
- Archive size: 550,571 bytes; 10 entries
- Source state: clean `SAP/open-ux-tools` commit `40393c7c6f98d13ad79301b83be7ab24a84a7e46` and clean `SAP/open-ux-odata` commit `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- Reproducibility: two clean builds had identical package hashes, fingerprints, sizes, SHA-256 values, and binary contents
- Generator tarball: 82,508 bytes, SHA-256 `f40c4a1eb86b95fb6776ed929934a40f978c7691f641b31b8be7ad824a6cacd5`
- Package verification: 23 suites and 198 tests passed; TypeScript build, zero-error lint, formatting, and the 67-file packed boundary passed
- Learned V4 verification: both classifier and SFT were ready; the provider executed; `$metadata` and `Products?$top=1` passed with one row; the installer restored the fixture byte for byte outside disposable `node_modules`
- Integrated p95 over five fresh-process samples: 2,595.700 ms cold whole-service generation, 19.072 ms warm-cache startup, 1,221.860 ms first acquisition, and 2,596.510 ms host provider work; every warm sample avoided model initialization
- Model evaluation: all 233 governed classifier cases ran; routed precision was 83.82% at 29.18% coverage; INT8 SFT passed 16/16 parse and exact-key checks and filled 261/261 requested fields; p95 was 7,559.574 ms
- Deterministic replay: classifier prediction fingerprint `996ecd51682b602623671a1607b2c7c152d6efc8a663fdeec29a1f12da4293b7`, SFT output fingerprint `a387914bf81db43f653aaf217fa5c275b10891ebf70d41414ab4a89c590acaf3`, and evidence SHA-256 `89a942e186b0f9510aa026ee6f1293a5f98de5a2450ae0e8c428c31a36d8b17b` matched the independent identical-seed replay
- Footprint: 266,364,774 / 314,572,800 total installed-and-cache bytes; all required gates passed and `footprintReady` is true; the separate generator-halving optimization target remains missed
- Report identities: evaluation fingerprint `2237987b581ad0a0689ff331985b9d4bf1f7c33a8ba886fe24d43102aeb0de81`, integration fingerprint `2463e1a0c832491831de6915699191113cb10b40cbf512f41ac215c00d2d8f31`, footprint fingerprint `a6b9a61aba123ed9ae4fcb04cdbe28c57c528e70d5f41e2616112b6ca159c122`
- Persisted local evidence: `/Users/I335123/Downloads/mockserver-data-generator-runtime-proof-darwin-arm64-cachefix-40393c7c6`

The current handoff archive is
`/Users/I335123/Downloads/mockserver-data-generator-dev-kit-3a16a758a6e58208.tgz`.
Verify its SHA-256 before extraction. This is the current local and BAS
candidate; earlier archives remain historical evidence for their exact gates.

## Scope boundary

This record proves local packaging, installation, discovery, provider execution,
deterministic fallback behavior, retained-pilot classifier/SFT loading, HTTP
serving, and restore behavior. It does not prove BAS environment compatibility
or promote the model's realism. Those require the BAS record and completion of
the fingerprinted external review campaign.
