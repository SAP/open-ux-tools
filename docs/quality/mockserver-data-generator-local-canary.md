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

## Scope boundary

This record proves local packaging, installation, discovery, provider execution,
deterministic fallback behavior, retained-pilot classifier/SFT loading, HTTP
serving, and restore behavior. It does not prove BAS environment compatibility
or promote the model's realism. Those require the BAS record and completion of
the fingerprinted external review campaign.
