# v3 training/export tooling

`export-v3-dataset.mjs` creates a local, offline v3 dataset envelope from JSONL
rows containing a `context` (or `fieldContext`), a unique `id`, a registered semantic
`label`, and a `group` identifying the source service or reviewed partition unit:

```sh
node scripts/mockserver-data-generator-training/export-v3-dataset.mjs \
  --input fields.jsonl --vocabulary /path/to/vocab.txt --output v3-export.json
```

The command loads the built generator runtime's `serializeFieldContextV3` and
MiniLM WordPiece tokenizer. It records serialized text, token IDs, serializer
fingerprint, vocabulary SHA-256, labels, and the 64-token bound. It performs no
network access, model download, or training. The envelope is deliberately
marked `qualification.status=unqualified`; a trained head still needs its
encoder/head checks, calibration evidence, sealed evaluation, and paired live
service gates before it can be used for promotion.

The trainer fits a deterministic multinomial logistic (softmax) linear head using
the existing encoder and runtime head representation. Train and calibration ID
lists must select disjoint groups and cannot share serialized contexts. Fitting
and calibration metrics are development diagnostics, not sealed-test results.
Both partitions must contain reviewed `unknown` abstention examples; the
trainer never manufactures an untrained abstention class. `REVIEW_ME` is a
pending decision and is rejected, not learned as a class.
The runtime permits these heads in development bundles only: an unqualified v3
head is rejected for preview/stable bundles before native allocation.

The incumbent real-service judgments can be migrated offline with
`convertIncumbentRoleJudgments()` in `lib/incumbent-role-converter.mjs`. Supply an
explicit review-source-to-canonical-service binding, the original checksum-verified
CSN/EDMX/schema graph, the canonical service-family split, and source permission.
The converter excludes `REVIEW_ME`, unauthorized sources, ambiguous joins, and
unsupported roles with reason counts. It does not copy source data into the npm
package or claim that a model-panel judgment is human-adjudicated. Use
`assertRolePartitionIsolation()` across training, calibration, and evaluation
before export; the v3 exporter retains family identity and the trainer rejects
sibling-service and exact serialized-context leakage.

The v49 planner's `semanticUnknown` means no value-planner descriptor. It is
**not** a reviewed `unknown` role label. `convertPlannerServiceV3()` skips such
role labels and can expose checksum-verified status-shaped fields as a pending
offline review queue via `includeReviewQueue: true`. This queue is not a runtime
rule or training label. The development trainer uses bounded class-balanced
weights and routes no role with fewer than five correct calibration examples or
family with fewer than ten; its raw prediction remains visible when routing
abstains. `evaluateRoleQualityGate()` measures accepted precision, supported
recall, status recall, sample breadth, and critical false positives separately.
Passing development tests or training loss is not a release qualification.

`audit-planner-status-queue.mjs` selects existing, checksum-verified status
contexts by canonical partition. Use `--all-public-holdouts` for the public
evaluation review queue, `--all-public-train-calibration` for public model
development, or `--all-authorized-train-calibration` to also include approved
internal structural metadata. The last option must write to a private location
outside the repository and package. Every emitted role remains pending until
adjudicated; do not move a holdout field into training or infer a role from its
name alone.

The pinned comparison artifacts are recorded in
`baselines/dev6-application-modeler-1.48.0.json` by npm integrity and VSIX
SHA-256. Replay requires identical service metadata, authored data, seed, row
counts, and runtime settings; the baseline record alone does not assert a paired
quality improvement. The measured status-label gap, fixed-input replay, and
release decision are in `baselines/2026-09-17-role-evidence-audit.md`.

Validate a produced envelope against local runtime artifacts:

```sh
node scripts/mockserver-data-generator-training/validate-v3-artifact.mjs \
  --artifact v3-export.json --vocabulary /path/to/vocab.txt
```

An explicitly bounded development head can be trained from local native ONNX
artifacts (the encoder SHA and disjoint JSON ID partitions are mandatory):

```sh
node scripts/mockserver-data-generator-training/train-v3-head.mjs \
  --artifact v3-export.json --manifest /path/to/models/manifest.json \
  --vocabulary /path/to/vocab.txt \
  --encoder /path/to/encoder.onnx --encoder-sha256 SHA256 \
  --train-ids train-ids.json --calibration-ids calibration-ids.json \
  --output head.json
```

This uses the runtime tokenizer/mean-pooling path and emits a complete v3 head
contract, but remains `qualification.status=unqualified`; no held-out quality,
sealed-service, or promotion claim is produced.

## Reviewed field-to-value relevance training

### Candidate extraction (development-only)

Before any relevance review, extract privacy-safe candidates from an approved
value catalog. The converter verifies each dataset is public,
redistributable, approved for generator training, confined below
`--source-root`, and byte-matches its catalog checksum. It emits no raw values,
does not assign `relevant` or `negativeKind`, and marks the packet
`qualification.status=unqualified`:

```sh
node scripts/mockserver-data-generator-training/extract-relevance-candidates.mjs \
  --catalog /secure/approved-values-v17/catalog.json \
  --source-root /secure/approved-values-v17 \
  --output /secure/relevance-review-packet.json \
  --split-by-service /secure/service-splits.json
```

`--split-by-service` is optional and is only copied into the packet when an
explicit service-ID map is supplied. The output is a review packet, not a
training dataset; human reviewers must create a separate reviewed dataset with
raw values held in an approved secure location before `train-relevance-head.mjs`
can consume it.

`train-relevance-head.mjs` trains a separate binary head over the same verified
MiniLM encoder. It does not create a value catalog or infer a business vocabulary.
Input is a local JSON array of reviewed records. Each record has a unique `id`,
the source `serviceGroup`, `reviewed: true`, a `relevant` boolean, and a `pair`
matching the runtime `SftCandidateRelevancePair` contract. Negative records must
also have `negativeKind: "cross-domain"`. The `pair` contains field, resource,
linked-code/text, relationship, and proposed-value context; it may contain
sensitive application data and must not be published or written to routine logs.

Training, calibration, and sealed ID files are JSON arrays of record IDs. The
three partitions must be disjoint by service and serialized pair. The sealed
partition is never used to fit weights or choose the threshold. The command
checks the exact encoder and vocabulary hashes and uses the runtime's shared
64-token projection:

```sh
node scripts/mockserver-data-generator-training/train-relevance-head.mjs \
  --dataset /secure/reviewed-pairs.json \
  --train-ids /secure/train-ids.json \
  --calibration-ids /secure/calibration-ids.json \
  --sealed-ids /secure/sealed-ids.json \
  --encoder /path/to/encoder.onnx --vocabulary /path/to/vocab.txt \
  --encoder-sha256 SHA256 --vocabulary-sha256 SHA256 \
  --output-head /secure/relevance-head.json \
  --output-report /secure/relevance-report.json
```

The output head is deliberately `qualification.status=unqualified`; the runtime
rejects it. Reviewers must verify provenance, sealed positive acceptance at
least 80%, hard-negative acceptance at most 1%, application-level outcomes, and
the release gates before approving a qualified artifact. Only then may the
immutable package manifest add its checksum as the classifier component's
`relevance-head` role. Until that happens, evidence-poor linked code/text
domains fail without writing placeholder project data.

`reviewed-role-join.mjs` joins prior semantic-role judgments to an exact,
checksum-bound schema field. The legacy `hint` is the semantic role; `label` is
only a display label. An evaluation-only review pack cannot be used for head
training, and `REVIEW_ME` is an unresolved review decision, not a classifier
class. The single future role classifier is v3; the relevance head is an
independent value checker, not a second role classifier.

`planner-v3-converter.mjs` projects one existing planner-dataset service at a
time through its checksum-verified CSN, EDMX or schema-graph source. Train and
holdout partitions must match the canonical split manifest and remain separate.
The descriptor-to-role map remains
machine-proposed, so converted rows and any resulting head are unqualified.
Unmapped or non-unique fields are reported as skipped rather than assigned a
guessed role. See `packages/mock-data-generator/evaluation/routing-realism-release-gates.md`
for the current corpus counts and release decision.

## Authorized-source development conversion

`convert-authorized-v3.mjs` is a read-only-source, development-only converter for
the reviewed registry/split manifests. It admits only `train` assignments whose
source is a `schema-graph` and whose license is redistributable Apache-2.0 or MIT.
Internal structural metadata requires the explicit `--include-internal` switch,
the existing `INTERNAL-OWNER-AUTHORIZATION` record, structural-metadata-only
scope, and passed privacy review. Evaluation, pending-rights, prohibited, and
non-train records are excluded. No value files are read or copied.

The descriptor catalog is used only through its exact `positiveFieldKeys`. The
versioned `v3-descriptor-role-mapping.json` is machine-proposed and unreviewed;
unmatched fields are omitted and are never assigned a guessed label. The output
retains registry, split, catalog, mapping, source checksum, graph fingerprint,
and a `conversionManifestFingerprint` in both the conversion manifest and the
exported rows. The resulting artifact and any head are unqualified development
artifacts.

Example (all outputs should be placed outside the repository):

```sh
node scripts/mockserver-data-generator-training/convert-authorized-v3.mjs \
  --registry /path/to/registry.json --split /path/to/splits.json \
  --catalog /path/to/descriptor-catalog.json \
  --mapping scripts/mockserver-data-generator-training/v3-descriptor-role-mapping.json \
  --source-root /path/to/incumbent --output /tmp/conversion.json \
  --rows-output /tmp/rows.jsonl
node scripts/mockserver-data-generator-training/export-v3-dataset.mjs \
  --input /tmp/rows.jsonl --vocabulary /path/to/vocab.txt \
  --output /tmp/export.json
node scripts/mockserver-data-generator-training/validate-v3-artifact.mjs \
  --artifact /tmp/export.json --vocabulary /path/to/vocab.txt
```
