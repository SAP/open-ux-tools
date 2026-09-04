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

## Scope boundary

This record proves local packaging, installation, discovery, provider execution,
deterministic fallback behavior, retained-pilot classifier/SFT loading, HTTP
serving, and restore behavior. It does not prove BAS environment compatibility
or promote the model's realism. Those require the BAS record and completion of
the fingerprinted external review campaign.
