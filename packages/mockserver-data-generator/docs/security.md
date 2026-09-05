# Security

`@sap-ux/mockserver-data-generator` is an opt-in local development component.
It runs inside the standard Fiori elements mockserver process and does not send
metadata, prompts, authored rows, or generated values to a remote inference
service.

The package is designed so that unavailable or rejected learned components do
not prevent the standard mockserver from starting. Learned generation is an
optional quality tier; deterministic, type-correct generation remains the
fallback.

## Trust boundaries

The generator treats these inputs as untrusted until they cross their owning
validation boundary:

- application configuration is validated by the FE host and again by the
  provider for generator-specific options;
- EDMX or CSN metadata is measured before parsing and converted into a narrow
  internal schema graph;
- authored mock data remains read-only context and always has precedence over
  provider output;
- model manifests and downloaded artifacts must pass identity, path, size, and
  checksum validation before a runtime receives them;
- learned output must pass grammar, type, facet, enum, relationship, and
  aggregate-result validation before publication;
- generated-data cache entries must pass checksum and schema validation before
  reuse; and
- the FE host independently validates, copies, freezes, and atomically
  publishes a complete provider result.

The provider is loaded only when an application explicitly configures
`mockDataGenerator`, and generation is enabled only for a launch requested with
`npm run start-mock -- --mockgen`. Importing the package, constructing the
provider, or starting without the flag does not parse metadata, access the
generated-data cache, download models, initialize an inference session, or
generate data.

## Model artifact controls

Model weights are not part of the npm package. A model manifest identifies an
immutable bundle revision and records the expected byte count and SHA-256 hash
for every component file. Distributed manifests are limited to a 200 MiB model
bundle.

Automatic acquisition accepts manifest-declared HTTPS artifacts and permits
loopback HTTP as a transport exception. The loopback exception applies
independently of manifest lifecycle and cannot address a non-local host.
Redirects are followed manually for at most five hops, and every hop must
satisfy the same transport policy. The default acquisition limit is 30
seconds. Bytes are streamed into a uniquely named temporary file and published
only after exact size and checksum verification.

The developer selects the cache root, which may be absolute. Manifest-owned
artifact paths must be normalized relative paths. Before network acquisition,
the downloader creates and validates every descendant directory beneath the
selected root segment by segment. It rejects pre-existing symbolic-link
descendants, non-directory segments, and real-path escapes, then repeats the
directory check immediately before atomic publication. The cache root must
still be writable only by trusted local users; these checks are not a sandbox
against an operating-system user who can concurrently replace its paths.
Interrupted, partial, or checksum-mismatched files are never loadable
artifacts.

Model bundles contain data only. They cannot declare packages, scripts,
entrypoints, hooks, or other executable code. The optional native inference
runtime is installed separately and its version must match the manifest's
runtime contract.

For offline or controlled environments, run `mockserver-data-generator
prepare` while network access is available and then run
`mockserver-data-generator verify`. Verification reads the local cache and
performs no network request.

## Resource and cache controls

- EDMX and CSN inputs are rejected above 32 MiB of UTF-8 data before hashing or
  parsing.
- Generated rows are limited to 1,000 per entity.
- Complete generated results are rejected above 64 MiB before caching or host
  publication.
- The generated-data cache has a deterministic 32 MiB LRU quota and uses
  temporary writes followed by atomic publication.
- Cache keys bind metadata, service identity, targets, authored relationship
  context, generation options, generator logic, and learned-component
  fingerprints.
- Classifier and SFT failures open local circuit breakers so one failed runtime
  is not retried repeatedly during the same generation epoch.
- SFT work observes an entity-level timeout and the host's live cancellation
  signal. The FE host additionally owns the end-to-end provider deadline.

The provider is trusted application-local code running in the mockserver Node.js
process. Its deadline prevents a late result from being published once control
returns, but a timer cannot preempt synchronous JavaScript in `generate()` or
`dispose()` that blocks the event loop. CPU-heavy provider work must yield or use
the package's worker/subprocess boundaries.

Deleting or editing model files is not a supported recovery mechanism. Pin a
verified immutable manifest, disable the provider, or follow the packaged
[troubleshooting guide](./troubleshooting.md).

## Privacy and diagnostics

Library and provider diagnostics are local and bounded. Support messages may
include stable codes, counts, timings, and lowercase SHA-256 component
fingerprints. They must not include raw metadata, prompts, source rows,
generated values, credentials, artifact URLs, cache paths, or unfiltered
runtime exception text. Successful CLI reports follow the same rule. CLI
command failures can include operating-system or local-file details from
explicitly supplied paths; treat stderr as sensitive and review it before
sharing. The package does not emit external telemetry.

Do not place customer data, credentials, or private application payloads in a
model manifest or development-kit archive. Model and dataset provenance,
privacy, license, derivative-use, retention, and redistribution approval are
release gates separate from package tests.

## Release limitations

The initial package remains a development preview. Local tests establish the
implemented controls, but they do not establish public redistribution rights
or cross-platform release approval. Learned-mode release additionally requires
all of the following:

- an approved immutable model bundle and distribution channel;
- supported native-runtime packages for every release platform;
- Node and operating-system qualification, including BAS;
- software-bill-of-materials, provenance, signing, and dependency review;
- fresh fingerprint-bound realism review; and
- published-artifact verification plus model-channel rollback testing.

Until those gates pass, use only approved internal or local development model
artifacts. Do not represent a successful installation or deterministic fallback
as evidence that the learned model passed realism or governance gates.

## Reporting a vulnerability

Do not report security vulnerabilities through a public GitHub issue. Follow
the repository's [SAP security policy](https://github.com/SAP/open-ux-tools/blob/main/SECURITY.md).
