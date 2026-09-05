# Architecture

`@sap-ux/mockserver-data-generator` is an opt-in whole-service data generator
for the standard Fiori elements mockserver. It converts resolved OData EDMX or
CAP CSN metadata into structurally valid, coherent rows while preserving every
developer-authored mock-data source.

The package is not middleware. Applications continue to use one
`sap-fe-mockserver`, one `ui5-mock.yaml`, and their existing `start-mock`
command.

## System boundary

The standard mockserver owns service discovery, provider loading, reloads,
deadlines, existing-data precedence, and HTTP serving. This package owns schema
interpretation, whole-service generation, optional learned inference,
constraint validation, model acquisition, and generated-data caching.

The integration has two public entry points:

- `@sap-ux/mockserver-data-generator` is the host-independent ESM API.
- `@sap-ux/mockserver-data-generator/fe-mockserver` is the CommonJS provider
  loaded by the mockserver's generic `mockDataGenerator` extension point.

The host does not import this package. The provider adapter consumes only the
public host contract and keeps host internals out of the generation engine.

## Generation flow

```text
resolved metadata + eligible targets + read-only existing rows
                           |
                           v
               metadata byte-limit check
                           |
                           v
                  EDMX or CSN adapter
                           |
                           v
                 canonical schema graph
                           |
             +-------------+-------------+
             |                           |
             v                           v
  optional semantic classifier   lexical/annotation fallback
             |                           |
             +-------------+-------------+
                           |
                           v
       deterministic keys, values, coherence, relationships
                           |
                           v
           optional SFT fill for unreserved residual fields
                           |
                           v
     property, key, relationship, and aggregate-size checks
                           |
                           v
            immutable whole-service generation result
```

`generateService` always constructs a complete deterministic snapshot first.
The optional classifier improves semantic routing; safe lexical and annotation
rules cover abstentions. The optional fine-tuned generator may replace only
eligible residual fields, and every replacement must satisfy the same property
facets as deterministic values. Key fields, relationship fields,
coherence-owned fields, and properties referenced by V2 or V4 field-control
metadata are never delegated to SFT inference.

The canonical graph retains CAP labels, descriptions, data elements, and
annotations; SAP V2 property attributes; and V4 inline or externally targeted
property annotations, including targets written with a schema alias. Explicit
semantic markers are authoritative over learned output. Otherwise a calibrated
classifier decision is preferred, followed by lexical evidence from the
business-facing label and then the technical property name. Rich metadata is
available to injected classifiers without changing the byte-level text contract
used to train the retained pilot classifier head.

The final result is immutable and contains generated resources, bounded safe
diagnostics, learned-capability state, component fingerprints, and aggregate
SFT statistics. Metadata is rejected above 32 MiB and the complete serialized
result above 64 MiB before it can cross the host publication boundary.

## Data ownership and precedence

The host invokes the provider only for resources without an authoritative
initial-row source. Developer data remains authoritative in this order:

1. TypeScript or JavaScript contributor-owned initial rows;
2. JSON mock data, including an intentional empty array;
3. provider rows from this package;
4. the host's built-in generator when enabled;
5. empty data.

Contributor hooks remain active when their module does not own initial rows.
Tenant-specific authored data continues to override generated sources at
request time. The provider receives read-only existing rows only as relationship
context and never writes developer mock files.

## Runtime and artifact boundary

Classifier and SFT weights are not npm contents. An immutable model manifest
binds every component to a revision, byte count, SHA-256 checksum, runtime
contract, and component fingerprint. The CLI prepares model files in a local
cache using streamed size and checksum verification followed by atomic
publication. Warm offline verification performs no network request.

`onnxruntime-node` is an optional peer dependency. Importing the public package
or constructing the provider performs no network access, model loading, or
generation. A service adapter loads its learned runtime lazily after a verified
generated-data cache miss and releases owned sessions during disposal.

Whole-service generated snapshots use a separate bounded cache. Its key binds
metadata, service identity, eligible targets, existing relationship context,
generation options, generator logic, and learned component fingerprints. Cache
entries are checksum- and schema-validated before use. A changed model
fingerprint therefore cannot reuse rows produced by another model.

## Dependency direction

Internal dependencies follow these rules:

- schema adapters create the canonical graph and do not depend on generation,
  model, cache, or host modules;
- semantic modules depend on schema contracts and injected classifier
  interfaces, not concrete model loading;
- generation modules depend on schema and semantic contracts but not model
  acquisition, ONNX sessions, caches, or the FE host adapter;
- model modules implement injected runtime interfaces and do not control schema
  parsing, planning, validation, or host behavior;
- the generated-data cache validates serialized public result contracts and
  does not invoke generation or learned runtimes;
- the FE adapter is the composition boundary for model loading, generated-data
  caching, the public generation API, and the host contract.

This direction keeps deterministic generation usable without ONNX Runtime and
allows classifier, SFT, cache, and host behavior to be tested independently.

## Failure behavior

Classifier failure, SFT failure or timeout, unavailable model files, and cache
read/write failures produce bounded diagnostics and retain deterministic rows.
A failed learned component opens a per-provider circuit so later entities do
not repeatedly invoke the same failing runtime.

Service-wide failures such as invalid metadata, an oversized result, an
incompatible provider contract, malformed provider rows, or the host deadline
cause the host to reject the complete provider result. The standard mockserver
then continues with its built-in or empty fallback. Partial provider snapshots
are never published.

Reload ownership remains in the host. It serves the previous complete snapshot
while a serialized generation epoch runs, suppresses stale results, atomically
publishes a validated replacement, and disposes the provider when the service
registry shuts down.

## Development and release evidence

The source repository contains model-free development-kit and evaluation
harnesses. The development kit packs this package with compatible unpublished
host packages and installs them transactionally into an existing Fiori
application. Evaluation binds classifier/SFT inputs, quantization candidates,
structural reports, performance measurements, and realism packets by checksum.

Passing local tests or an installation canary proves package behavior, not
model realism or public redistribution rights. Stable promotion additionally
requires governed model artifacts, release-platform qualification, an actual
BAS canary, independent realism review, and verification of published npm and
model artifacts.
