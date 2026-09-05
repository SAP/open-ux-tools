# `@sap-ux/mockserver-data-generator`

Generates context-aware, structurally valid mock data for SAP Fiori applications from OData metadata. The package is an opt-in data provider for the standard `@sap-ux/ui5-middleware-fe-mockserver`; it does not add a second middleware or start command.

## Status

This package is under development for an initial preview. The production design uses one whole-service generation pass with four ordered tiers:

1. values declared by metadata and reference catalogs;
2. calibrated semantic classification, governed value banks, and coherence groups;
3. an optional local fine-tuned model for unresolved fields;
4. deterministic, type-correct fallback.

The classifier and fine-tuned generator are independently replaceable runtimes. Their large model artifacts are acquired into a checksum-verified local cache and are not published in the npm package. Any unavailable or failed learned tier degrades to usable deterministic data.

Learned mode also requires the native ONNX runtime selected for the current
platform. Each model manifest pins an exact runtime version. The current source
validates the `onnxruntime-node` `1.24.x` contract, but an approved
platform-specific runtime distribution is still a release gate.

The initial preview is English-first. Non-English inputs retain structural
validation and deterministic fallback protection, but semantic quality outside
the qualified English cohort is not yet a release claim. Structural validity,
classifier accuracy, SFT parse/fill rates, and judged realism are separate
gates. Pilot measurements are retained as historical comparison evidence; the
exact release candidate still requires its own fingerprint-bound realism
review.

## Normal Fiori developer flow

The generated application already contains the small npm package as a
development dependency. Starting normally keeps standard mockserver behavior:

```bash
npm run start-mock
```

Add the one runtime flag to use MockGen:

```bash
npm run start-mock -- --mockgen
```

The first flagged start checks the package-owned release manifest and prepares
the classifier and SFT files in the SAP tools user cache. It reports concise
status codes while it works. Every artifact is size- and SHA-256-verified before
it becomes usable. Later flagged starts verify and reuse the cache without a
network request. The application directory and authored mock data are never
changed.

If acquisition fails, Fiori still starts and MockGen uses deterministic tiers.
The package does not run `npm install` when the flag is used: installation
happens through the application's normal dependencies, while only large release
artifacts are acquired on first use.

An optional command is available for offline or centrally provisioned
environments. With a released package, its manifest and cache location are the
defaults:

```bash
node ./node_modules/@sap-ux/mockserver-data-generator/dist/cli.js prepare

node ./node_modules/@sap-ux/mockserver-data-generator/dist/cli.js verify
```

`prepare` accepts an optional `--mirror <https-base-url>` and a bounded
`--timeout-ms <milliseconds>`. Internal development and controlled rollback can
also override `--manifest` and `--cache`. `verify` performs no network access.
Command output contains bundle and component fingerprints, but not artifact
URLs or local cache paths.

When no custom fetch implementation is supplied, `prepare` honors the standard
`HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables (including
their lowercase forms). Proxy support is loaded only for a cache miss when a
proxy is configured; verified warm-cache use remains network-free.

Normal applications do not configure model or cache paths in YAML. The launcher
passes its verified cache-only state privately to the provider. This source
package is still version `0.0.0` and intentionally has no public release
manifest; the package check prevents a publishable version from being packed
without one. Development can use the local/BAS kit with approved pilot-local
artifacts until the immutable hosted bundle and platform runtime are approved.

## FE mockserver integration

The standard mockserver loads the CommonJS provider export:

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      configuration:
        mockDataGenerator:
          name: '@sap-ux/mockserver-data-generator/fe-mockserver'
          options:
            seed: 42
            rowsPerEntity: 10
            sftTimeoutMs: 60000
            generatedDataCache: true
```

Per-service settings can override the global setting, and `mockDataGenerator: false` opts one service out. Developer-authored JavaScript, TypeScript, or JSON mock data always wins.

The setup helper keeps one `start-mock` script and wraps its existing Fiori
command with this package's launcher. Without the flag, the standard mockserver
generates missing data and MockGen performs no metadata, cache, model, network,
or generation work:

```bash
npm run start-mock
```

Append the opt-in flag after npm's argument separator to use MockGen for the
same server process. The launcher consumes the flag, prepares its release-owned
artifacts, and then starts Fiori:

```bash
npm run start-mock -- --mockgen
```

For the flagged command, the launcher resolves the application-installed
`@sap-ux/ui5-middleware-fe-mockserver` and requires its
`MOCK_DATA_GENERATOR_API_VERSION` capability to equal `1` before Fiori starts.
An older, missing, or unloadable host stops only the flagged command with a
path-free compatibility message. `npm run start-mock` skips this check and
continues to use standard mock data. The host packages containing the provider
SPI and capability marker must therefore be released before this package; the
first compatible npm versions will be recorded after that host release exists.

The current implementation automatically prepares the classifier and SFT
artifacts. Shipping the selected native runtime in the same platform-aware flow
remains open because the upstream runtime package contains several operating
systems and exceeds the approved footprint. The measured WASM candidate was
larger and slower, so it is not the fallback plan.

`sftTimeoutMs` bounds each entity-level fine-tuned inference. The direct API
defaults to 90 seconds and accepts at most 120 seconds; the standard FE host
independently caps the complete provider epoch at 60 seconds, so a larger
entity timeout cannot extend host startup. After the first SFT runtime failure
in a service generation, remaining entities use deterministic fallback without
retrying that failed tier.

Whole-service results are cached by default beneath
`~/.saptools/mockserver-data-generator/generated-data`, with a hard 32 MiB LRU
quota. The cache key binds the metadata, service, requested targets, existing
data, generation options, generator-logic version, classifier, and SFT
fingerprints. Entries are checksum- and schema-validated before reuse, corrupt
or stale entries are quarantined, and a warm hit does not initialize model
sessions. Set `generatedDataCache: false` to disable this cache, or set
`generatedDataCacheDirectory` to use an explicit writable location such as a
BAS workspace cache. Cache failures only add a diagnostic; generation and the
standard mockserver remain available.

EDMX and CSN inputs have a fixed 32 MiB UTF-8 byte ceiling. The public API
checks the limit before fingerprinting, cache validation, or schema parsing and
throws `MetadataInputTooLargeError` with code
`METADATA_INPUT_TOO_LARGE`. The FE provider logs only that stable code and byte
counts; the standard mockserver then uses its normal built-in/empty fallback.

Complete generated results have a separate fixed 64 MiB UTF-8 ceiling matching
the standard FE host contract. The public API checks both newly generated and
cached results before publication and throws `GeneratedResultTooLargeError`
with code `GENERATED_RESULT_TOO_LARGE`, preventing oversized results from being
published by the standard FE host.

## Programmatic API

```ts
import { generateService } from '@sap-ux/mockserver-data-generator';

const result = await generateService(
    {
        metadata: { format: 'edmx', content: edmx },
        service: { urlPath: '/sap/opu/odata/example', odataVersion: '4.0' },
        targets: [{ name: 'Products', kind: 'entity-set' }],
        existingData: {}
    },
    { seed: 42, rowsPerEntity: 10, sftTimeoutMs: 30_000 }
);
```

See the [package architecture](./docs/architecture.md) and
[host contract](./docs/host-contract.md) for the complete lifecycle,
precedence, model, and degradation rules.
The [pilot parity](./docs/pilot-parity.md) record identifies preserved behavior,
intentional production changes, and excluded or still-deferred pilot scope.
Operational diagnosis, offline verification, forced regeneration, explicit
model pinning, and provider rollback are covered in the
[troubleshooting guide](./docs/troubleshooting.md). The package's trust
boundaries, artifact controls, privacy rules, and open release gates are in the
[security guidance](./docs/security.md).

## Test current source in a Fiori application

The packages are unpublished during development. Use the
[local/BAS development kit](https://github.com/SAP/open-ux-tools/tree/main/scripts/mockserver-data-generator-dev-kit)
to pack the current generator and matching FE mockserver host, install them
transactionally into an existing generated application, run an HTTP canary, and
restore the application afterward. Do not use a registry npx command for this
source state.

## Model evaluation

The [model evaluation harness](https://github.com/SAP/open-ux-tools/tree/main/scripts/mockserver-data-generator-evaluation)
reuses the pilot classifier/SFT cohorts and artifacts through explicit local
paths, fingerprints every input, compares quantization candidates in isolated
processes, and emits no generated values into this repository. Current
development measurements and the INT4/WASM decisions are recorded in the
[model evaluation report](https://github.com/SAP/open-ux-tools/blob/main/docs/quality/mockserver-data-generator-model-evaluation.md).

## Verify the npm boundary

Repository contributors can run `pnpm check:package` from this package after
building. The check inspects the actual packed archive, enforces the five-MiB
compressed-size ceiling, rejects model/checkpoint files, datasets, caches,
judge outputs, source maps, links, and developer-local paths, validates packed
`model-manifest*.json` files, and guards public API/provider construction
against standard Node.js network entry points.
