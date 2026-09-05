# MockGen pilot parity

This record maps the successful `sap-ai-mockserver` pilot to the production
`@sap-ux/mockserver-data-generator` implementation. It prevents stable
promotion from relying on a vague statement that the pilot was "ported."
Parity means that a behavior is either preserved with executable evidence or
has an explicit product disposition below.

The pilot remains a read-only evidence and artifact source. Its package names,
private datasets, model weights, generated values, and judge outputs are not
published by this npm package.

## Preserved behavior

| Pilot behavior | Production disposition | Executable evidence |
| --- | --- | --- |
| Generate service data from SAP metadata | Preserved for OData V2/V4 EDMX and CAP CSN through one canonical service graph | `test/unit/csn-generation.test.ts`, `test/unit/edmx-relationships.test.ts`, and the V2/V4/CDS integration fixtures |
| Generate one coherent service rather than unrelated columns | Preserved through whole-service planning, parent-first relationship resolution, and final validation | `test/unit/relationship-invariants.test.ts`, `test/unit/semantic-coherence.test.ts`, and `test/unit/coherence.test.ts` |
| Use declared values and constraint-valid deterministic fallback | Preserved; deterministic generation remains the final non-optional tier | `test/unit/constraints.test.ts`, `test/unit/csn-generation.test.ts`, and `test/unit/api.test.ts` |
| Classify business meaning before choosing values | Preserved through lexical evidence plus the retained MiniLM embedding classifier | `test/unit/embedding-classifier.test.ts`, `test/unit/minilm-runtime.test.ts`, and the governed classifier evaluation |
| Use the fine-tuned local generator for unresolved fields | Preserved through the retained SmolLM2 SFT runtime and `row-object-v1` constrained decoding | `test/unit/sft-runtime.test.ts`, `test/unit/causal-text-runtime.test.ts`, and `test/unit/json-row-grammar.test.ts` |
| Keep code/text, amount/currency, quantity/unit, names, dates, statuses, and relationships coherent | Preserved with metadata-derived grouping and service-level validation | `test/unit/semantic-coherence.test.ts`, `test/unit/coherence.test.ts`, and `test/unit/relationship-invariants.test.ts` |
| Produce deterministic results for the same material inputs | Preserved; metadata, existing data, options, generator logic, classifier, and SFT fingerprints participate in the cache identity | `test/unit/generated-data-cache.test.ts`, `test/unit/model-manifest.test.ts`, and `test/unit/api.test.ts` |
| Continue when learned inference is unavailable or invalid | Strengthened; every model, runtime, acquisition, timeout, malformed-output, and cache failure has deterministic degradation | `test/unit/learned-runtime.test.ts`, `test/unit/model-downloader.test.ts`, `test/unit/fe-mockserver.test.ts`, and the degradation integration suite |
| Reuse the pilot classifier, SFT, and judging work | Preserved through fingerprinted, read-only evaluation inputs and checksum-verified model artifacts | The model-evaluation and realism-campaign integration suites bind the retained cohorts, manifests, outputs, and judge evidence |

## Intentional production changes

| Pilot design | Production design | Reason |
| --- | --- | --- |
| Several pilot-scoped runtime packages | One public `@sap-ux/mockserver-data-generator` package with internal module boundaries | Reduce consumer complexity and align ownership with the SAP repository |
| A separate middleware, secondary mockserver YAML, and separate start command | One `sap-fe-mockserver`, one `ui5-mock.yaml`, and the existing `start-mock` | MockGen is an opt-in data provider, not a competing server |
| A warmup command materialized a second mock-data directory | The provider generates one service snapshot and stores only a fingerprinted generated-data cache | Avoid modifying or shadowing developer-authored mock files |
| Model files were installed beside the pilot runtime | Model weights remain outside npm and are acquired from an immutable manifest into a checksum-verified cache | Enforce package size, provenance, rollback, and supply-chain boundaries |
| Optional dependencies implicitly selected learned behavior | Classifier and SFT components are independently versioned, verified, reported, and safely degradable | Make capability and failure state observable without preventing startup |
| Pilot-local cache and environment conventions | Bounded generated-data and model caches use SAP/Fiori tooling locations or explicit injected directories | Support local development, BAS, read-only applications, and deterministic cleanup |
| Pilot integration commands edited an application for a second workflow | The development kit transactionally installs unpublished packages, verifies the existing workflow, and restores the app | Make local and BAS testing reproducible without publishing pilot package names |
| Broad runtime diagnostics could include implementation detail | Stable diagnostic codes and numeric bounds are exposed; metadata, values, URLs, and local paths are not logged | Meet enterprise privacy and supportability requirements |

See the [architecture](./architecture.md), [host contract](./host-contract.md),
and [security guidance](./security.md) for the governing production contracts.

## Deferred or excluded pilot scope

- OpenAPI generation is not part of the SAP standard mockserver integration
  objective. No OpenAPI compatibility is claimed for this package.
- The initial preview is English-first. Non-English metadata still receives
  structural validation and deterministic fallback, but equivalent semantic
  realism is deferred until a governed multilingual cohort passes.
- Corpus-retrieval grounding is intentionally excluded because the pilot found
  that weak field-name matches could introduce wrong-domain values.
- Pilot-only package names, secondary mockserver configuration, separate start
  command, and warmup workflow are migration inputs, not compatibility
  surfaces.
- Pilot reference banks or catalogs are not copied merely for behavioral
  similarity; each production value source needs an approved provenance and
  redistribution disposition.
- Public model hosting, an actual BAS canary, the complete Node/OS matrix, and
  published-package compatibility remain release gates.
- Historical LLM judgments remain comparison evidence. They do not replace the
  fresh, fingerprint-bound dual-provider review required for the production
  candidate.

## Current retained-model evidence

The current production-format evaluation executes 233 governed classifier
cases and 16 held-out INT8 SFT cases from the pilot evidence without copying
their payloads into the package. Independent replay currently retains:

- classifier prediction fingerprint
  `996ecd51682b602623671a1607b2c7c152d6efc8a663fdeec29a1f12da4293b7`;
- SFT output fingerprint
  `a387914bf81db43f653aaf217fa5c275b10891ebf70d41414ab4a89c590acaf3`;
- judge-evidence SHA-256
  `89a942e186b0f9510aa026ee6f1293a5f98de5a2450ae0e8c428c31a36d8b17b`.

Those identities prove deterministic reuse of the retained evidence. They do
not, by themselves, prove that a future published candidate has passed the
fresh realism or governance gates.

## Stable-promotion gate

Before stable promotion, update this record against the exact immutable release
candidate and require all of the following:

1. OData V2, OData V4, and CAP CSN fixtures pass through the standard
   mockserver path with authored data unchanged.
2. The deterministic, classifier, SFT, relationship, cache, degradation, and
   rollback contracts pass against the packed artifacts.
3. The exact model/runtime pair passes structural, footprint, latency, memory,
   privacy, provenance, and redistribution gates.
4. A blinded dual-provider review passes at least 80% overall and for every
   declared domain and metadata format.
5. Local, BAS, and supported Node/OS canaries verify installation, first use,
   warm reuse, upgrade, disablement, removal, and restoration.
6. Published npm and model artifacts are re-downloaded and verified by their
   recorded hashes before the pilot is archived as read-only.

Any pilot behavior not listed here is unproven until it has a named test or an
explicit deferred/excluded disposition. Adding a production behavior requires
updating this record in the same change.
