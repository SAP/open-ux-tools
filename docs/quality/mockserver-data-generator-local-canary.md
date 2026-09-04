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

| Fixture | Metadata endpoint | Entity endpoint | Rows | Restore |
| --- | --- | --- | ---: | --- |
| OData V2 EDMX | passed | Products?$top=1 passed | 1 | exact |
| OData V4 EDMX | passed | Products?$top=1 passed | 1 | exact |
| CDS metadata processor | passed | Products?$top=1 passed | 1 | exact |

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

## Scope boundary

This record proves local packaging, installation, discovery, provider execution,
deterministic fallback behavior, HTTP serving, and restore behavior. It does not prove BAS environment compatibility
or learned-model realism. Those require the BAS record and the fingerprinted
model/evaluation campaign.
