# Mockserver Data Generator Design

**Status:** Approved for implementation

**Date:** 2026-09-03

**Primary repository:** `SAP/open-ux-tools`

**Host repository:** `SAP/open-ux-odata`
**Pilot evidence:** local `sap-ai-mockserver` pilot repository, retained as a
read-only evidence source until governance approves migration

## Decision

Reimplement the experimental MockGen integration pilot as the public package
`@sap-ux/mockserver-data-generator` in `SAP/open-ux-tools`. The package will be
loaded by the existing `sap-fe-mockserver`; it will not register a second UI5
middleware, create a second YAML file, or add a second start command.

The current mockserver API cannot inject rows into an already configured
service. The referenced CDS package is a metadata processor that compiles CDS
to EDMX, while the current general plugin interface only contributes additional
services. `SAP/open-ux-odata` therefore needs a small, generic
`mockDataGenerator` service-provider interface. The production generator and
all model-management code remain owned by `SAP/open-ux-tools`.

## Goals

- Generate realistic, structurally valid mock data for SAP Fiori applications
  from metadata alone.
- Keep standard mockserver behavior as the default and enable MockGen only when
  the user appends `--mockgen` to the existing `start-mock` npm script.
- Support OData V2 EDMX, OData V4 EDMX, and CAP metadata used through the FE
  mockserver CDS metadata processor.
- Preserve existing hand-authored JS, TS, and JSON mock data.
- Generate a service as one unit so keys, foreign keys, code/text pairs,
  amount/currency pairs, and temporal relationships remain coherent.
- Reuse the classifier data, SFT data, model artifacts, and LLM judge harnesses
  already produced by the pilot.
- Keep npm packages small by downloading immutable, checksum-verified model
  artifacts on first use and caching them locally.
- Degrade to deterministic standard generation when a model, runtime, network,
  or cache is unavailable. A model failure must never prevent the mockserver
  from serving the application.
- Make every release reproducible through data, code, model, runtime, prompt,
  and evaluation fingerprints.

## Non-goals for the first release

- Fixing the finance sample application bug.
- Replacing `@sap-ux/ui5-middleware-fe-mockserver`.
- Supporting OpenAPI input in the first SAP release.
- Shipping training data, judge outputs, checkpoints, or model weights in npm.
- Sending application metadata, generated values, or telemetry to SAP or a
  third party.
- Using global links, workspace-directory `file:` dependencies, or copied
  `node_modules` as the supported local/BAS test transport.
- Treating package installation, schema validity, or LLM parse success as proof
  of realism.
- Promoting or repeating a lower-precision experiment without documented
  calibration and the full candidate gates.
- Implementing WASM unless the bounded native-versus-WASM experiment meets its
  footprint, correctness, memory, and latency gates.

## Repository boundaries

| Repository | Ownership |
| --- | --- |
| `SAP/open-ux-tools` | `@sap-ux/mockserver-data-generator`, package tests, evaluation and local/BAS development tooling, and consumer documentation |
| `SAP/open-ux-odata` | Generic `mockDataGenerator` SPI, provider loading, precedence and degradation behavior, host lifecycle, and host contract tests |
| Internal model repository | Governed datasets, training and export code, immutable candidates, evaluation reports, and promotion attestations |
| SAP model distribution namespace | Cleared immutable model bundles, manifests, model cards, licenses, and hashes |
| Pilot repository | Read-only comparison evidence until stable cutover is complete |

## Public package and configuration

The user installs one opt-in package and keeps one `start-mock` script. Normal
startup remains the standard mockserver path:

```text
npm run start-mock
```

MockGen is enabled for one process by appending the explicit flag after npm's
argument separator:

```text
npm run start-mock -- --mockgen
```

The installer wraps the application's existing simple Fiori command without
copying or replacing it. For example:

```json
{
  "scripts": {
    "start-mock": "mockserver-data-generator start -- fiori run --config ./ui5-mock.yaml --open test/flpSandbox.html"
  }
}
```

The launcher accepts `start -- <command> [arguments...]`, consumes exactly one
optional `--mockgen` argument from the child-command arguments, and never passes
that private option to the Fiori CLI. It always overwrites the internal child
environment marker: `1` when the flag is present and `0` otherwise. It spawns
the original command without a shell, inherits standard I/O, forwards
termination signals, and returns the child's exit status. Missing child
commands, duplicate flags, or unsupported complex shell scripts fail with a
clear diagnostic instead of being guessed or rewritten.

The standard middleware remains the only UI5 middleware:

```yaml
- name: sap-fe-mockserver
  beforeMiddleware: csp
  configuration:
    generateMockData: true
    mockDataGenerator:
      name: "@sap-ux/mockserver-data-generator/fe-mockserver"
      options:
        rowsPerEntity: 10
        seed: 42
        locale: en
    services:
      - urlPath: /sap/opu/odata/sap/DEMO_SRV
        metadataPath: ./webapp/localService/metadata.xml
        mockdataPath: ./webapp/localService/data
```

For CAP CDS input through the FE mockserver, both extension points coexist:

```yaml
metadataProcessor:
  name: "@sap-ux/fe-mockserver-plugin-cds"
mockDataGenerator:
  name: "@sap-ux/mockserver-data-generator/fe-mockserver"
```

Model revisions and file hashes are release-owned and pinned in the package's
model manifest. Normal application configuration does not use a mutable model
name such as `latest`.

The provider reads the launcher-owned activation marker at generation time. If
the marker is not `1`, it immediately returns an empty resource map before
metadata parsing, cache access, model loading, network access, or generation.
The generic host then follows its existing per-resource precedence and uses the
built-in generator when `generateMockData` is enabled. If the marker is `1`,
the provider runs the classifier and SFT-capable generation path. Authored
JS/TS/JSON data remains authoritative in both modes, and any active-provider
failure degrades to the standard generator.

## Host SPI

`SAP/open-ux-odata` will define a global and service-scoped configuration:

```ts
export type MockDataGeneratorJsonValue =
    | string
    | number
    | boolean
    | null
    | ReadonlyArray<MockDataGeneratorJsonValue>
    | { readonly [key: string]: MockDataGeneratorJsonValue };

export interface MockDataGeneratorConfig {
    name: string;
    timeoutMs?: number;
    options?: Readonly<Record<string, MockDataGeneratorJsonValue>>;
}

export type MockDataGeneratorSetting = MockDataGeneratorConfig | false;
```

The loaded provider implements an asynchronous, whole-service operation and an
optional lifecycle hook:

```ts
export interface IMockDataGenerator {
    readonly apiVersion: 1;
    generate(context: MockDataGenerationContext): Promise<MockDataGenerationResult>;
    dispose?(): void | Promise<void>;
}
```

The versioned context contains raw resolved metadata, stable service identity,
requested entity-set/singleton targets, contributor presence separated from
initial-row ownership, safely enumerable existing rows, a narrow logger, and
an `AbortSignal`. It contains no absolute application paths, metadata-processor
options, or host internals. The host recursively validates, copies, and freezes
the data-bearing service, target, existing-data, and option DTOs, then freezes
the outer context. It passes the narrow logger wrapper and original live
`AbortSignal` by reference. Rows are independently bounded, validated, copied,
and frozen. The result contains per-resource rows, structured diagnostics, and
generator/model fingerprints. It never exposes model-specific objects to the
host.

The host creates one provider per eligible service generation epoch and calls
it at most once during initialization or any reload entry point. A host-owned
deadline, monotonic epoch, and serialized coordinator prevent ignored
cancellation or late results from blocking startup or replacing newer state.
The deadline starts immediately before `generate` and remains active through
complete-result validation, defensive copying/freezing, and the atomic
publication check; resolving the provider promise does not clear it. Validation
checks the monotonic deadline incrementally and the coordinator checks it again
immediately before publication.
The previous complete snapshot remains served until metadata, ETag, row
sources, and provider rows can be swapped atomically. Request handling never
invokes the model.

## Data precedence

The host applies this order independently for every entity set or singleton:

1. A TS contributor module before JS when both exist.
2. Initial rows supplied by that contributor, when present.
3. Existing JSON mock file, including an intentionally empty file.
4. Rows returned by `mockDataGenerator`.
5. The existing built-in `generateMockData` behavior when enabled.
6. Empty data when generation is disabled.

Existing files are authoritative and are never overwritten. The generator is
given enough read-only context to align missing child or lookup sets with
existing static parent rows. When a dynamic contributor cannot be safely
enumerated during initialization, the generator records the limitation and
does not invent relationships to it.

A hook-only JS/TS contributor remains active around JSON, provider, built-in,
or empty rows; module presence alone does not claim initial-row precedence.
Source presence is explicit so an intentionally empty authored or provider
array is not mistaken for missing data.

## Generator architecture

```text
EDMX or CSN
    -> validated SchemaGraph and stable schema fingerprint
    -> service plan and relationship order
    -> T0 declared metadata values and reference catalogs
    -> T1 selective semantic classifier, curated banks, coherence groups
    -> T2 optional local SFT model under a fixed time budget
    -> T3 deterministic type-correct fallback
    -> constraint and referential-integrity validation
    -> atomic generated-data cache
    -> standard FE mockserver
```

The production implementation ports verified behavior, not the pilot's package
layout or namespace. The package has focused modules for schema adaptation,
planning, constraint validation, semantic classification, whole-service
generation, model resolution, caching, and diagnostics.

Generation is deterministic for the tuple of schema fingerprint, generator
logic version, model fingerprints, seed, locale, row-count policy, and existing
data fingerprint. That tuple is also the generated-data cache key.

## Failure handling

- Missing or unsupported model runtime: skip the affected learned tier.
- First-use download unavailable: use cached artifacts if valid; otherwise
  continue through the remaining tiers.
- Checksum mismatch or partial download: reject the artifact and never expose
  it as a valid cache entry.
- Inference timeout or malformed model output: reject the candidate values,
  continue through validation and fallback, and do not retry the failed model
  repeatedly in the same process.
- Generator module cannot load or throws: log a structured warning and retain
  the host's built-in generation behavior.
- Generated-data cache is corrupt: quarantine the entry and regenerate or
  fall back.
- Watch reload: cancel the old generation, invalidate the service cache, and
  publish the replacement atomically.

Diagnostics include component versions, fingerprints, elapsed time, entity and
row counts, tier shares, fallbacks, constraint relaxations, and error codes.
They exclude raw metadata, prompts, and generated values.

## Model distribution

The npm tarball contains code, small reference catalogs, and a signed or
otherwise integrity-checked manifest. It contains no ONNX or SafeTensors model.
The resolver downloads immutable artifacts to a user cache, verifies declared
size and SHA-256 before atomic publication, supports corporate proxies and an
approved mirror, and uses a cross-process lock.

Generated rows also use the SAP/Fiori tools user cache by default so a read-only
application directory remains supported. An explicit `cacheDir` may opt into a
project-local cache. A `prepare` command lets users acquire and verify the model
before an offline session; it does not create another application start flow.

The classifier, generator model, and inference runtime remain independently
versioned. Changing any fingerprint invalidates the compatible generated-data
cache. A channel manifest can promote or withdraw an immutable model without
rewriting the artifact.

## Local and BAS developer test kit

Development uses packed npm tarballs so the manual workflow tests the same
package boundary that will eventually be published. Workspace symlinks can hide
missing exports or files and cannot be transported from macOS to BAS Linux, so
they are not the default workflow.

Root-level development tooling supports the flow; it is not part of the public
generator package or its runtime API:

```text
scripts/mockserver-data-generator-dev-kit/build-dev-kit.mjs
scripts/mockserver-data-generator-dev-kit/setup-local-fiori-app.mjs
```

The direct local command builds and packs the current generator. Until the host
SPI is published, it also requires a compatible `open-ux-odata` checkout or
explicit core and middleware tarballs. The portable command produces one dev-kit
archive containing the generator, host core and middleware tarballs, a bundled
development-only configuration installer, an integrity manifest, and BAS
instructions. The installer uses the unchanged public
`@sap-ux/mockserver-config-writer` API for the standard mockserver setup, then
adds only the local MockGen dependency, provider block, and reversible launcher
prefix around the existing simple `start-mock` command. It is fingerprinted and
has no imports back into either source worktree. It does not require changes to
shared configuration packages, include model weights, or carry platform-specific
`node_modules`.

The installer requires an explicit existing Fiori application path and validates
`package.json`, `webapp/manifest.json`, UI5 configuration, Node version, package
manager, and the local artifact manifest. It refuses the tool repository itself
as the target. It configures the existing `sap-fe-mockserver`, copies tarballs to
the stable application-local `.mockserver-data-generator-dev/packages`
directory, installs them as relative `file:` development dependencies, and
verifies their resolved versions and hashes.

Before changing the application, the installer atomically writes a recovery
journal containing original file content and hashes to
`.mockserver-data-generator-dev/state.json`. It rejects symlinked mutation targets
and proves every resolved destination remains beneath the explicit application
root. `--dry-run` shows the planned file and command changes without writing. An
install failure or termination signal triggers a guarded rollback. `--restore`
restores only when current files still match the installer's recorded
post-install hashes, then performs a frozen package-manager install so
`node_modules` again matches the original manifest and lockfile. It refuses to
overwrite later user edits. The local exclude entry is added only when its real
path is safe and contained; it is tracked in the journal and removed on restore.
Changes to `package.json`, the lockfile, and `ui5-mock.yaml` remain visible for
review.

`--verify` checks that there is exactly one `sap-fe-mockserver`, no generator in
the legacy `ui5.dependencies` allow-list, and only the wrapped `start-mock`
script. It then invokes the equivalent application-local Fiori/UI5 command
headlessly on a free loopback port twice: once with MockGen disabled to prove
the standard path, and once with the same internal activation marker used by
`--mockgen` to prove provider generation. It requests `$metadata` and one entity
set, captures generator fingerprints and degradation state, and terminates each
process. It does not execute a `start-mock` script that may contain `--open`.
Normal setup does not leave a server running; `--start` is explicit.

Model acquisition is also explicit through `--prepare-model`. This keeps the
basic packaging/integration smoke independent from a large download and allows
separate tests for deterministic fallback, a pre-cached model, and online model
acquisition. An actual BAS canary remains required because BAS proxy, certificate,
filesystem, and runtime behavior cannot be proven by a local Linux approximation.
The development kit may expose `--prepare-model` once Phase 7 is implemented.
Local tests can use fake or pilot-local artifacts, while public model manifests
and downloads remain disabled until redistribution clearance.

## Existing evidence and required repairs

The implementation starts from the pilot's existing classifier, calibration,
SFT, exported-model, quantization, and LLM-as-judge evidence. Exact corpus
counts, artifact fingerprints, intake findings, model measurements, and
evaluation results remain in the private intake record until a disclosure owner
classifies them.

The data is reused rather than recollected. Before retraining, the governance
workflow must verify that every supervised label has authorized provenance,
every review method is attributed accurately, per-example lineage is complete,
normalized duplicate groups do not cross splits, and SFT and final evaluation
splits are service/application-family-disjoint. Any evidence that fails a check
is quarantined or corrected before it is used for a promoted candidate.
Existing judge scores remain historical evidence; a fresh dual-provider run is
required for the exact candidate fingerprint being promoted.

## Size and runtime policy

- Packed npm package: at most 5 MiB and no model/checkpoint extensions.
- Default model transfer and verified cache: each at most 200 MiB for preview;
  the generator-weight optimization target is
  `floor(approvedBaselineBytes / 2)`.
- Total persistent incremental installed and cached footprint: at most 300 MiB,
  including an enforced 32 MiB generated-data-cache quota rather than an
  history-dependent observed cache size.
- Provider/module-load p95: at most 250 ms; model-session-load p95: at most 5
  seconds; cold whole-service generation p95 with verified warm artifacts: at
  most 25 seconds on the accepted reference platform.
- Generated-data cache hit: at most 200 ms added startup on the reference
  machine and no model session initialization.
- T2 inference: bounded by the existing 20-second session budget.
- Automatic first-use acquisition: bounded to 30 seconds before deterministic
  fallback; slower or offline environments use the explicit `prepare` command.
- End-to-end host provider deadline: 60 seconds, covering acquisition,
  inference, result validation, and publication.

Model bytes, compressed transfer bytes, runtime installed bytes, cache bytes,
load time, peak RSS, and generation latency are reported separately.
`approvedBaselineBytes` is the exact generator-weight file length from the
cleared dynamic-int8 manifest, never a rounded display value.

The runtime experiment compares native ONNX Runtime with ONNX Runtime Web/WASM.
Its footprint ratio uses only the package and backend-specific production
dependency closure, with identical model and cache bytes held constant and the
product-total effect reported separately. WASM advances only if that paired
runtime footprint falls by at least 25% on the fixed primary platform, every
required platform passes independently, every functional gate passes, memory
stays within budget, and p95 generation latency is no worse than 1.5 times
native while remaining inside the 20-second budget. Platform samples are never
pooled. This experiment can reduce runtime packaging; it is not presented as a
way to compress model weights.

## Quality and promotion policy

The metric definitions, frozen denominators and assertions, harness/platform
bindings, thresholds, and failure dispositions in the architecture review's
Phase 0 promotion matrix are normative. This summary cannot relax them.
Structural and coherence gates are absolute:

- 100% known-property, type, nullability, maximum-length, precision/scale, key
  presence/uniqueness, enum, foreign-key, containment cardinality/shape, and
  navigation-target validity over every emitted applicable value, row, and edge.
- At least 99% raw-response parse/decode success. The denominator is every
  completion request assigned to T2 by the frozen workload, including timeouts,
  empty responses, and malformed responses.
- At least 95% requested-field fill before deterministic fallback. The
  denominator is every eligible scalar slot frozen in the T2 assignment
  manifest; authored, computed, server-managed, and metadata-defaulted slots
  are excluded before execution.
- No evaluated entity set produces zero valid rows unless its fingerprinted
  fixture declares `expectedEmpty: true` before candidate execution.
- 100% of the frozen metadata-derived relationship assertions and code/text,
  amount/currency, quantity/unit, date-range, person/address, status, draft, and
  value-help coherence assertions pass.
- Identical inputs and seed produce identical published output fingerprints.
- Existing mock files remain byte-for-byte unchanged.
- No optional capability failure blanks or prevents startup of the app.

The selective classifier must meet or exceed the current routed-precision,
coverage, and calibration baselines, including at least 80% routed precision in
every sufficiently represented domain. Unsupported inputs abstain.

Realism promotion requires a fresh, fingerprint-bound, dual-provider review of
at least 300 fields, with at least 50 per application family and per schema
format, at least 80% consensus-realistic overall and in every domain/format,
zero critical issues, and no coverage gaps. Expert review is targeted to
legacy records that fail provenance checks and new provider disagreements
rather than repeating a blanket human study.

## CAP scope

CAP metadata consumed through the FE mockserver needs no separate generator
integration: the existing CDS metadata processor and the MockGen provider are
configured together. A native CAP persistence adapter is not part of this
project scope and would require a separate request and design.

## Release strategy

Release order is:

1. Generic host SPI prerelease from `SAP/open-ux-odata`.
2. Generator package preview from `SAP/open-ux-tools`.
3. Cross-platform, size, security, real-application, and realism qualification.
4. Stable package and model-channel promotion.

Every model promotion is a reversible manifest change. The previous promoted
model remains available, a kill switch can disable T2, and rollback to the
previous model is exercised before stable release.

The pilot is archived only after stable parity and rollback validation. Its
ignored `data/` and `var/` contents are not assumed to be durable until their
authoritative artifacts are inventoried, hashed, cleared, and copied to managed
storage.

## Design acceptance

The approved implementation scope is the production version of the pilot:
generic host SPI, deterministic generation, classifier, SFT inference, and
local/BAS tooling. CAP metadata is supported only through the standard FE
mockserver CDS metadata processor. Shared UI5 configuration packages, general
creation tooling, MCP content, and a native CAP adapter remain unchanged.
Implementation and local evaluation may use the existing pilot workspace
immediately.

Two normal engineering checkpoints protect repository and release boundaries:

- **Merge review:** the two repositories review their feature-branch changes
  through the standard pull-request process.
- **Artifact release review:** data/model provenance, privacy, licenses,
  storage, and redistribution are cleared before datasets or weights leave the
  pilot workspace or become downloadable product artifacts.

Preview and stable promotion additionally require the structural, quality,
realism, security, footprint, compatibility, and rollback gates.

The chosen architecture is the generic host SPI plus the production provider;
no alternate custom-middleware implementation is in scope. `metadataProcessor`
and the global file loader remain unchanged because neither is a row-generation
extension point.
