# Fiori mockserver host contract

**Status:** Proposed for maintainer acceptance

**Package:** `@sap-ux/mockserver-data-generator`

**Host:** `@sap-ux/fe-mockserver-core`

**Contract version:** 1

**Provider baseline:** `SAP/open-ux-tools` `6879d47df9097421fd98edf0800eb13c2c513aa9`

**Host baseline:** `SAP/open-ux-odata` `d94d8d3c31bb770e267784e0011aee5fb7e361a6`

## Integration boundary

Subject to the promotion gates, the package will provide realistic missing mock
rows to the standard Fiori elements mockserver through the host's generic
`mockDataGenerator` SPI. It is not a UI5 middleware and does not contribute
services. Applications retain one `sap-fe-mockserver` middleware, one
`ui5-mock.yaml`, and one `start-mock` command. The command uses standard host
generation by default and activates the provider only when the user appends
`--mockgen`.

The package owns schema interpretation, planning, realistic generation,
constraint validation, learned-model resolution, caching, and privacy-safe
diagnostics. The host owns provider loading, lifecycle, existing-data
precedence, and fallback to its built-in generator.

## Package exports

The public package name is `@sap-ux/mockserver-data-generator`. The root export
contains the host-independent generation API. The
`@sap-ux/mockserver-data-generator/fe-mockserver` subpath contains the host
adapter.

The `/fe-mockserver` subpath must be loadable by the current CommonJS-based
host loader while the package root remains ESM/NodeNext. Its package export
map therefore provides conditional `import`, `require`, and `types` entries;
the CommonJS build has an explicit `tsconfig.cjs.json`/`dist-cjs` output and is
verified from the packed tarball.

No host package imports this generator. The generator adapter uses only public
SPI types and does not import host internals.

## Configuration

A Fiori application opts in inside the existing middleware configuration:

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
```

A service-specific setting fully replaces an inherited global setting. A
service can set `mockDataGenerator: false` to disable global inheritance. The
host treats provider options as opaque values; the adapter validates all
generator-specific options. Application configuration accepts a package export
specifier, not a relative path or URL. `timeoutMs` is a host-owned positive
integer that defaults to and is capped at 60,000 milliseconds. It bounds the
whole generation epoch from immediately before `generate` through complete
result validation, defensive copying/freezing, and the atomic publication
check; it is not only a timeout on the provider promise.

Plugin-contributed services inherit the global setting unless they override or
disable it. Services discovered only from external metadata references do not
inherit it. `generateMockData` independently controls the host's built-in
fallback and does not silently enable or disable this provider.

For CDS input through the FE mockserver, metadata processing and row generation
are independent and coexist on the same standard middleware:

```yaml
metadataProcessor:
  name: "@sap-ux/fe-mockserver-plugin-cds"
mockDataGenerator:
  name: "@sap-ux/mockserver-data-generator/fe-mockserver"
```

The package is installed only as an application `devDependency`. It is never
added to the legacy `package.json.ui5.dependencies` allow-list.

The application installer wraps the original simple `fiori run` script as
`mockserver-data-generator start -- <original command>`. The launcher removes
one exact optional `--mockgen`, overwrites `SAP_UX_MOCKGEN_ENABLED` for the
child, and starts the original command without a shell. The adapter returns an
empty resource map before any generator work unless that marker is `1`, letting
the host continue to its standard built-in fallback.

## Adapter behavior

The host creates one adapter instance per service registration, reuses it for
serialized watch and explicit reloads, and passes validated, deeply copied
options to its constructor. The adapter exposes
`apiVersion: 1`; import and construction perform no download, model load,
generation, or filesystem mutation. For each `generate` call, the adapter:

1. Validates contract version and options.
2. Converts resolved EDMX and existing-data context into the package's
   host-independent service input.
3. Calls the whole-service generator exactly once.
4. Returns immutable per-resource rows, safe diagnostics, and component
   fingerprints.
5. Observes the host `AbortSignal`; each entity-level SFT call also has a
   bounded timeout. Host cancellation stops the stale learned work without
   poisoning later reloads. A genuine inference failure opens the affected
   component circuit for the remainder of the process.

`dispose()` may be synchronous or asynchronous. At service-registry shutdown it
releases model sessions owned by that service adapter and tolerates repeated or
partial cleanup.

The adapter never makes an LLM call from an HTTP request handler. Model work
occurs only during initialization, explicit preparation, or watch reload.

The host context contains resolved EDMX, eligible resource names and kinds,
existing initial-row state, a narrow logger, an `AbortSignal`, and only stable
service identity (`urlPath`, optional alias, and OData version). It does not
expose absolute metadata/mock-data paths, metadata-processor options, internal
capture flags, or the host logger object. The host recursively validates,
copies, and freezes the data-bearing `service`, `targets`, `existingData`, and
`options` values, then freezes the outer context object. The metadata string is
immutable. It passes a narrow logger wrapper and the original live
`AbortSignal` by reference so logging and cancellation remain operational.
Rows returned by the adapter are independently validated, copied, and frozen.

## Existing-data and fallback guarantees

The generator receives only entity sets and singletons that are missing an
authoritative initial-row source, plus read-only context for safely enumerable
existing data. It must use that context to align generated children and lookup
rows with static parents. Contributor-module presence is represented separately
from initial-row ownership so hook-only contributors can remain active while
rows come from a later source. When contributor-owned rows cannot be safely
enumerated, the adapter records the limitation and does not invent references
to unknown values.

The provider creates a cross-resource relationship only when metadata supplies
usable constraints or when it owns and validates both sides of an inline
subgraph. Otherwise it abstains from that relationship; semantic plausibility
alone is not referential-integrity evidence.

The host applies this precedence independently per resource:

1. A TS contributor module before JS when both exist.
2. Contributor-owned initial rows, when present.
3. Existing JSON, including an intentionally empty array.
4. Provider initial rows.
5. Built-in generation when enabled.
6. Empty data.

Contributor hooks remain active around JSON, provider, built-in, or empty rows.
Source presence is explicit; an empty authored or provider array is not treated
as a missing source.

The package never writes to a developer's mock-data files. Tenant-specific
authored data remains authoritative at request time.

OData V4 `ContainsTarget` navigation data is not an independent top-level
target. Contract version 1 does not synthesize complex or containment values;
unsupported EDM property shapes fail the provider generation safely and leave
the standard mockserver fallback active. A future containment contract would
need parent identity and canonical containment paths.

If an optional learned model is unavailable or inference fails, the generator
continues through its T0/T1/T3 deterministic tiers and returns valid provider
rows. If the adapter cannot load, its API version is incompatible, the host
deadline expires, generation fails service-wide, or its supplied result is
malformed, the host rejects that whole result and continues through its
built-in/empty fallback. Optional capability failure must not prevent the
application from starting.

## Model and package boundary

The npm package contains code, small reference catalogs, and immutable model
manifests only. It contains no ONNX, SafeTensors, checkpoints, training data,
judge outputs, provider outputs, prompts with source data, or Python
environment.

Model artifacts are acquired separately, size-checked, SHA-256 verified, and
atomically cached in the SAP/Fiori tools user-data location. Mutable model
names such as `latest` are not accepted in application configuration. A
missing, corrupt, slow, or offline model degrades through deterministic tiers
without weakening structural validity.

Generated whole-service snapshots use a separate 32 MiB user-data cache. Its
key includes all material generation inputs and learned-component
fingerprints. A cache entry is parsed into bounded immutable values, checksum
verified, and revalidated against the current schema, requested resources,
property constraints, key uniqueness, and relationship integrity before it is
served. Invalid entries are quarantined. Publication uses a unique temporary
file, file synchronization, and atomic rename; a cache read or write failure
never prevents normal generation.

Raw EDMX and serialized CSN inputs are measured as UTF-8 and rejected above a
fixed 32 MiB ceiling before fingerprinting, cache validation, or parsing. The
provider emits the privacy-safe code `METADATA_INPUT_TOO_LARGE` with byte counts
and rejects its whole result, allowing the host to continue through its normal
built-in/empty fallback without publishing partial generated data.

The generator also measures the complete serialized result and rejects it
above 64 MiB with `GENERATED_RESULT_TOO_LARGE`. This mirrors the standard host
ceiling before a result can be cached or published.

## Diagnostics boundary

Returned diagnostics can include stable error codes, component versions,
artifact fingerprints, elapsed times, counts, tier shares, fallbacks, and
constraint relaxations. They exclude raw metadata, generated values, prompts,
credentials, application paths containing user data, and model inputs.

The host stages and validates the complete service result before publishing any
part. An invalid supplied known resource rejects the whole provider result so
partial acceptance cannot break relationships; missing requested resources
fall through individually, and unknown extras are ignored with one bounded
diagnostic. Version-1 host limits cover row count, nesting depth, serialized
bytes, diagnostics, message length, and fingerprint format. The exact limits
are 10,000 rows per resource, nesting depth 32, a 64 MiB serialized result, 100
diagnostics, and 1,024 characters per diagnostic message. Fingerprints are
limited to 32 entries with ASCII keys up to 64 characters and ASCII values up
to 256 characters.

The host keeps the monotonic epoch deadline active while it performs bounded
validation, copying, and freezing, checks it incrementally during traversal,
and checks it again immediately before the atomic swap. A provider result that
resolves before the deadline but crosses it during host processing is rejected
as a timed-out stale epoch and cannot publish.

Sanitized diagnostics and fingerprints are emitted through the host logger
with a fixed `mock-data-generator:` prefix and one-line JSON payload. Provider
options and raw thrown messages are never logged, allowing the local/BAS
verifier to capture stable evidence without exposing application content.

## Reload contract

A single host-owned coordinator serializes file-watch reload,
`POST /$metadata/reload`, and capture-and-simulate metadata arrival. It assigns
monotonic epochs, coalesces concurrent events, serves the previous complete
snapshot while generating, and atomically swaps metadata, ETag, resolved row
sources, and provider rows. The router remains stable. Timeout or supersession
marks an epoch stale, aborts its signal, suppresses late publication, and
attaches rejection handling even when the provider ignores cancellation.

## Cross-repository compatibility gates

A candidate is compatible only when all of the following pass against packed
artifacts:

- CommonJS host loading of the conditional `/fe-mockserver` export.
- OData V2 and V4 whole-service generation.
- V4 provider-owned roots with to-many and to-one inline containment, direct
  child navigation, and `$expand`; authored-parent containment remains
  unchanged.
- CDS metadata processor and data generator coexistence.
- Global configuration, service override, and explicit service disable.
- Authored JS/TS/JSON and intentionally empty JSON precedence.
- Provider load/generation failure with built-in fallback.
- Host-enforced timeout, serialized reload, stale-result suppression, and
  bounded disposal across every reload entry point.
- Absence of the provider is behavior-neutral.
- The packed npm artifact is at most 5 MiB and contains no learned artifact.

The compatible host package range is chosen only after these fixtures pass. A
contract-version-1 host emits a clear diagnostic for an incompatible provider.
A pre-SPI host may discard the unknown configuration before loading this
adapter, so the configuration writer, local/BAS installer, and package
compatibility metadata own the minimum-host diagnostic.

## Repository and release checks

This document mirrors `SAP/open-ux-odata/docs/mock-data-generator-provider.md`.
Both records and the cross-repository fixtures change together when the
contract changes.

The implementation follows the existing Open UX package review process.
Ordinary maintainer review is required before merge. Model provenance,
redistribution, and hosted-artifact verification are publication checks; they
do not change the SPI or block local feature-branch implementation.
