# Mockserver data generator threat model

Date: 2026-09-04

Status: implementation controls reviewed locally; release security gates remain
open where listed below.

Candidate code:

- `SAP/open-ux-tools` runtime package commit
  `817382b88f2cd88a84eb093410ad2a3a367b5505`
- `SAP/open-ux-odata` host test commit
  `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- package archive SHA-256
  `3e4713f6d1c4501a6049653c9d8f974c6e38ea8bfc4b6eff0c1b8ce56340bfe2`
- model manifest SHA-256
  `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`

## Scope and security objectives

MockGen is an opt-in local development feature. The standard FE mockserver owns
HTTP serving and loads the configured provider from an installed package. The
provider parses application metadata, may load an explicitly pinned local
classifier/SFT bundle, and returns generated rows to the host. It is not a
multi-tenant production data service and does not send metadata, prompts, or
generated values to an external inference endpoint.

The required security properties are:

1. Developer-authored data is never overwritten or silently displaced.
2. A model, network, cache, runtime, or provider failure cannot prevent the
   standard mockserver from starting.
3. Downloaded artifacts are data only, immutable, size-bound, and verified
   before use; they cannot select executable code.
4. Untrusted metadata, model output, caches, and provider results remain within
   explicit type, size, time, and complexity boundaries.
5. Diagnostics expose stable state and fingerprints without raw metadata,
   prompts, source rows, generated values, credentials, or developer-local
   paths.
6. Package, model, runtime, evaluation, and handoff artifacts remain separately
   attributable and checksum-bound.

## Trust boundaries

| Boundary | Less-trusted input | Trusted owner | Required transition |
| --- | --- | --- | --- |
| Application configuration to FE host | provider name, options, paths | `open-ux-odata` host | load only the explicitly configured installed module; deep-copy and freeze options |
| Metadata and authored rows to provider | EDMX/CSN and existing-data description | MockGen schema and precedence layers | parse into a narrow graph; preserve authored ownership; reject unsupported structures |
| Model manifest to local cache | URLs, paths, sizes, hashes, runtime contract | MockGen manifest/downloader | validate immutable identity and HTTPS policy before bounded acquisition |
| Local cache to model runtime | ONNX, tokenizer, config, classifier head | verified cache and fixed runtime adapters | reject missing, linked, wrong-sized, or checksum-mismatched files; never load model-side code |
| Model output to generated snapshot | generated tokens and JSON fields | grammar, constraints, and whole-service validator | accept only requested, type-correct values; use deterministic fallback for every rejection |
| Provider result to FE host | rows, diagnostics, fingerprints | generic host contract | bound, copy, freeze, validate, and publish atomically before serving |
| Development kit to application | tar entries and local package archives | transactional installer | verify inventory/checksums, reject link/traversal entries, and restore owned files exactly |

## Threat and control matrix

`controlled` means the implementation and a focused local regression establish
the control. `partial` means an implementation exists but a release environment
or remaining bound is still required. `external` means repository code cannot
close the disposition.

| ID | Threat | Current controls and evidence | Status | Remaining release action |
| --- | --- | --- | --- | --- |
| T01 | A provider is loaded without explicit opt-in or application data selects a module | One `mockDataGenerator.name` setting is required; service opt-out is supported; options are defensive copies; authored data prevents unnecessary provider loading; the missing-provider regression proves standard fallback and redacted logging | controlled | Verify the same behavior from published host/provider tarballs |
| T02 | Malformed or oversized EDMX/CSN causes parser confusion or excessive synchronous work | Unsupported property types, inheritance cycles, missing definitions, invalid facets, and malformed documents fail closed; a fixed 32 MiB UTF-8 ceiling rejects input before fingerprinting, cache validation, or parsing; FE tests prove stable `METADATA_INPUT_TOO_LARGE` reporting and startup fallback | controlled | Repeat the ceiling and malformed-input regressions from published artifacts on release platforms |
| T03 | A manifest or artifact path escapes the model cache | Normalized relative paths reject absolute paths, drive prefixes, backslashes, empty segments, `.` and `..`; cache verification rejects symbolic links and real-path escape | controlled | Repeat on Windows and read-only/BAS filesystems |
| T04 | A compromised or interrupted model download becomes loadable | Immutable revision, expected bytes, SHA-256, HTTPS except loopback tests, streamed size/hash checks, temporary files, fsync, ownership fencing, atomic rename, final whole-bundle verification, and a local environment-proxy CONNECT regression | controlled | Run approved HTTPS proxy, certificate, mirror, and first-download canaries on release platforms |
| T05 | Concurrent processes steal a live cache lock or publish stale bytes | Exclusive lock directory/owner marker, heartbeat, stale-owner fencing, inode ownership checks, unique partial files, ownership assertion immediately before publication, and a true two-process acquisition regression | partial | Qualify networked/BAS filesystem semantics |
| T06 | A model bundle executes downloaded code | Manifest roles and runtime I/O are fixed; the runtime adapter opens verified data files only; model bundles cannot name packages, entrypoints, hooks, or scripts | controlled | SBOM and signing disposition for the separately installed native runtime |
| T07 | Malformed or adversarial model output corrupts rows or relationships | Grammar-constrained decoding, exact-key parsing, shared type/facet/enum checks, immutable relationship fields, whole-service validation, and deterministic replacement of rejected values | controlled | Run the release-platform structural cohort and external realism review |
| T08 | Excessive rows, output shape, recursion, or latency exhausts the host | Generator rows are limited to 1,000 per entity; complete generator and cached results are limited to 64 MiB before host publication; relationship search is step-bound; native inference is serialized; SFT and host calls are abortable and time-bound; the host independently limits results to 10,000 rows per resource, 64 MiB, 100,000 JSON nodes, and depth 32 | partial | Measure process-tree RSS and concurrency on Node 22/24 and supported OS/BAS targets |
| T09 | Provider/model errors leak metadata, prompts, values, paths, or control characters | Stable codes, capped diagnostic/event counts and lengths, control-character sanitization, generic host fallback errors, package path scans, and evidence export without local locators or generated rows | controlled | Privacy review the final support bundle and published documentation |
| T10 | A generated-data cache is poisoned, stale, partially written, or read-only | Cache key binds material inputs and component fingerprints; reads are bounded and schema-validated; corrupt entries are quarantined; writes are temporary, synchronized, atomic, and quota-managed; FE retains generated rows when cache reads/writes fail; local promotion and rollback tests prove model-fingerprint isolation | controlled | Prove cache migration and downgrade across published package versions |
| T11 | A development-kit archive writes outside its extraction/application root | Archive path/link validation, exact entry inventory, per-package checksums, real-path checks, transactional recovery, and byte-exact restore tests | controlled | Repeat exact archive in Linux CI and actual BAS |
| T12 | Package publication accidentally includes weights, datasets, caches, source maps, judge data, or developer paths | Packed-byte inspection enforces the 5 MiB ceiling and forbidden inventory/content policy; public construction is network-guarded; weights remain an external verified bundle | controlled | Verify public npm tarballs after prerelease publication |
| T13 | A vulnerable transitive dependency or native runtime compromises the process | Runtime identity/version is pinned; package and runtime footprints are separate; current workspace audit is recorded below | partial | Resolve or formally disposition upstream advisories; produce SBOM/provenance and apply release signing policy |
| T14 | Unlicensed, private, or contaminated data/model artifacts are redistributed | Public npm and dev kit exclude datasets and weights; retained inputs and final cohort are fingerprinted and service-disjoint | external | Obtain owner-approved provenance, privacy, derivative-use, license, retention, and redistribution decisions |
| T15 | A bad model promotion cannot be rolled back | Model identity and generated-cache keys are fingerprinted; an explicit local N-1 pin reuses only its matching cache; local provider disablement and deterministic fallback exist | external | Publish immutable current/N-1 bundles and run remote channel rollback, withdrawal, and T2 kill-switch canaries |

## Dependency audit disposition

On this candidate, `pnpm audit --prod` reports 10 repository-wide advisories:
3 high, 7 moderate, and 0 critical. The same counts and dependency paths
reproduce on exact `origin/main` commit
`6879d47df9097421fd98edf0800eb13c2c513aa9`; the feature did not introduce
them. No reported path traverses `@sap-ux/mockserver-data-generator` or its
runtime dependency closure.

The high findings are inherited through `yeoman-environment`, `pacote`, and
`@sap/approuter`. The moderate findings affect `decode-uri-component`,
`sanitize-html` (two advisories), `@humanfs/node`, `qs` (two advisories), and
`@xmldom/xmldom`. They remain real repository findings and must be handled by
the owning packages or explicitly accepted through the normal release-security
process. They are not silently waived here, and unrelated dependency upgrades
must not be mixed into the MockGen implementation commits.

`pnpm lint:dependency-versions` also reports the same six alignment findings on
the feature branch and exact `origin/main`. The MockGen-specific parser drift
was corrected separately: the workspace tests and downstream package now both
use the declared `fast-xml-parser@5.10.1`.

## Release disposition

The local model-free package boundary, exact archive canary, model-cache
integrity, provider degradation, and generated-row validation controls pass.
That is sufficient for continued internal development with the recorded
checksum-bound kit.

Stable or externally distributed learned mode remains blocked on:

1. data/model governance and redistribution approval;
2. two independent reviews of the exact blinded realism packet;
3. a supported platform-specific native runtime distribution or approved size
   policy exception;
4. Node 22/24 and macOS/Linux/Windows/BAS acquisition, RSS, and failure tests;
5. SBOM, provenance, signing, upstream dependency disposition, and published
   artifact verification; and
6. immutable model-channel N-1 rollback and kill-switch evidence.

No WASM work is required: the measured candidate was slower, used more memory,
and did not reduce the complete product footprint enough to offset those
regressions.
