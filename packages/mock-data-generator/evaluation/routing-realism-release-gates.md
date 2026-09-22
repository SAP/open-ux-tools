# Routing and realism correction: release hold

This record is for the next standalone MockGen package and Application Modeler
VSIX. It is not a promotion decision. Keep `@unseen/mock-data-generator@0.1.0-dev.6`
and Application Modeler `1.48.0` available for rollback; their pinned checksums
and deterministic fixture replay are in `baseline-artifacts.json`.

## Implemented locally

- API 2 separates metadata, classifier, lexical and abstained detections from
  provider binding; SFT eligible, accepted, rejected and fallback value slots
  are reported independently.
- Inspection retains detected role, decision source, provider rejection and
  validation status without routine generated-value logging.
- Authored rows and finite value-help domains are protected. Synthetic linked
  code/text domains require a qualified, checksum-bound relevance verifier;
  rejected proposals are retried at most twice and then abort without writing
  a placeholder. A residual linked caption cannot bypass verification because
  its key was classified or participates in a relationship. Finalization
  cannot clone a relevance-checked caption onto a new protected code.
- The optional relevance head reuses the v3 classifier encoder, with an exact
  64-token, serializer and artifact contract. The reviewed-pair trainer emits
  **unqualified** heads and rejects service-overlapping or unreviewed inputs.
- Routed finite sample domains now reduce rows with an explicit key-domain
  diagnostic when they cannot supply distinct keys; they no longer crash the
  service with a duplicate key or fabricate additional domain values.
- Data Editor checks API 2 and forwards the package's execution mode, routing,
  coverage, validation and unverified-domain warning instead of manufacturing
  them. Its existing dev.6 package pin is intentionally not advanced. A local
  hash-based ownership marker lets a later run replace untouched MockGen output
  while preserving any subsequently edited JSON as authored. Lost IPC after the
  commit boundary is reported as an unknown file outcome, not a pre-commit
  failure.

## Blocking evidence and artifacts

### Migration routing audit

The role head in `sap-ai-mockserver` and this package is byte-identical
(SHA-256 `dcf20dc38dd615075e216e4411cc01cb39781c66a368320172c1e0671aa7eb2a`).
The coverage regression is downstream of the head: the old profile admitted
non-abstention predictions at the head's calibrated 0.4 threshold and mixed
them with observed-name evidence; the new arbitrator also applies a 0.9
registry threshold to many roles and rejects labels without a registry entry.
The old UI's apparent coverage cannot therefore be attributed solely to the
classifier.

In a local replay with the unchanged head, 47 of 168 Travel fields and 125 of
402 finance fields had a non-abstention prediction above the head's threshold;
only 3 and 5 respectively were accepted as classifier decisions by the new
arbitrator before this repair. These are **model-eligible counts**, not proven
correct labels or a measurement of the old end-to-end accepted count. The head
had 12 non-abstention labels absent from the new role registry. This change
restores generic date, datetime, time and business-partner-identifier routing,
and reports raw classifier predictions separately from provider binding.
All other packaged-head labels now have explicit registry contracts: generic
identifiers use facet-bounded synthetic formats; cost-center, fiscal-period and
tax-code roles stay unbound without application evidence. A generic narrative
role on a linked code/text field cannot validate business meaning and must go
through the qualified relevance verifier when evidence is absent.
Application-specific labels still require evidence or a reviewed provider;
restoring the remaining labels by inventing values would be a false fix.
The global registry threshold was not lowered. Paired quality and latency
measurements remain open.

The incumbent `sap-ai-mockserver` workspace **does contain reviewed source
evidence**. Its canonical registry and split pointers resolve to checksum-
matching local artifacts. The v49 planner dataset has 473 service-disjoint
assignments: 129 train, 42 calibration, and 302 across four holdout cohorts.
The train partition contains 2,419 `llm-consensus-reviewed` target fields.
`cap-sflight-public` and `finance-cash-public` are both in the unseen-SAP
holdout, and their source fixture checksums match the registry. Do not ask for
these datasets or fixtures again, and do not move holdout records into training.

There is also a legacy semantic-role corpus at
`data/classifier-full-live-claude46-gpt54-gemini-2026-05-27`: its training
rows include 387 `order_status` labels, and its report records 23,926 retained
model-judge agreements. A separate 300-field benchmark has seven
`order_status` labels. These are real prior review artifacts, not new v3
training/evaluation results. The benchmark's `human_adjudicated` marker is
explicitly described in its own rows as **automated** adjudication, not a
human rating. The 75,790-row real-service label corpus has service identifiers,
but 9,132 rows are still marked `REVIEW_ME`, and it contains no accepted
`order_status` label. Review scope and source permissions must be retained when
reusing any of these records: the legacy real-service pack explicitly says
`derivativeTrainingAllowed=false` and permits evaluation/weak supervision,
not direct model fitting.

The v49 planner/descriptor train vocabulary has 25 titles and no status-role
title; 54 reviewed train fields whose context mentions status have no
descriptor assignment. The current v3 descriptor-to-role map is explicitly
machine-proposed and unreviewed. The approved value corpus is authorized for
generator training, but its approval does not itself label field/candidate
relevance or cross-domain hard negatives. Reuse these existing sources and
their review lineage to construct and audit the new contracts; record any
label gaps precisely instead of describing the whole corpus as absent. The
two holdout fixtures exist, but paired evaluation of the new packed package
against them has not been run.

The checksum-verified v49-to-v3 projection was exercised without training on
holdouts and now checks each service against the canonical split manifest. It
produced 412 contexts from 123 train services (six roles,
including `unknown`) and 146 contexts from 14 publicly reusable calibration
services (four roles). The SFlight and Finance holdout fixtures produced 19
and 21 contexts respectively, covering only `unknown`, `city`, and `email`.
The remaining reviewed planner fields have no audited descriptor-to-role map;
they must not be silently guessed. The separate legacy semantic-role corpus
does contain 387 synthetic `order_status` training examples, but those rows
lack verified source-service schemas and cannot by themselves establish v3
training/serving parity or service-disjoint status evaluation.

The incumbent SFT training manifest reports 3,743 examples assembled from
multiple sources. A local sample of its training JSONL includes an off-topic,
instruction-like value. Source approval is therefore not sufficient to treat
every generated field/value pair as a reviewed positive relevance label.
Existing hard-negative review artifacts inspected here concern
field-to-**descriptor** decisions, not field-to-**generated-value** relevance.
The relevance training gate remains unmeasured rather than waived.
The checksum-verified approved-values-v17 catalog can now be projected into a
privacy-safe, explicitly unqualified relevance-review packet. A local dry run
found 128,198 unique field/value candidates across seven public service
groups. Those are candidate identities, **not** reviewed field/value relevance
labels or hard negatives; no release metric is inferred from their count.

| Gate | Current state |
| --- | --- |
| Reviewed service-disjoint role labels and calibration | Prior semantic-role labels, including status, and service-disjoint planner evidence exist in the incumbent workspace. Exact-schema v3 conversion now works for eligible CSN/EDMX/schema-graph sources, but the mapped subset has no positive status role and remains unqualified. Provenance filtering, calibration against the exact packaged encoder, and sealed evaluation remain open. The existing packaged classifier is the pilot v2 head; the next release must contain exactly one qualified role classifier with passing measured gates, regardless of contract version. |
| Reviewed positive field/value pairs and cross-domain hard negatives | Approved source values exist, but reviewed field/candidate relevance pairs and cross-domain negative decisions have not been identified in the current evidence inventory. Derive candidates from existing sources and audit the new labels; no qualified relevance head is bundled. |
| Classifier precision/recall and zero-critical-false-positive gate | Not measured on reviewed unseen fields. |
| Relevance positive acceptance >=80%, hard-negative acceptance <=1% | Not measured on reviewed sealed pairs. |
| Travel, unrelated visible service, two sealed services, blinded realism review | Two checksum-verified unseen-SAP source fixtures are available. Local deterministic replays generated all 23 SFlight and 17 finance resources with structural validation, but domain meaning remained synthetic-unverified. The native SFlight replay completed in hybrid mode with 6 classifier-accepted decisions among 149 fields; finance aborted on `SFT_CANDIDATE_VERIFIER_UNAVAILABLE: BankAddress`, as required while the relevance head is absent. These are failure-analysis replays, not paired dev.6 quality measurements or blinded reviews. |
| Packed native cold/warm and BAS paired latency <=5 minutes, <=10% warm regression | The latest local native package installed and ran cold/warm, but this one-row smoke is not a latency qualification. The qualified candidate and BAS paired sample are unavailable. |
| Publication rights and governance evidence for new training-derived artifact | Not attached to a qualified manifest. |
| Matching npm version/integrity and VSIX | Not built or published; the branch's dev.6 pin is API 1 and must not be shipped with API 2. |
| Repeated Data Editor generation | Hash-based ownership is implemented and unit-tested. A crash after file commit but before the marker is saved conservatively treats output as authored on the next run. BAS repeat-run validation remains required. |
| Generated-data cache | The internal source-layer reader/writer derive a key from the exact request, options and active runtime, reconstruct semantic roles, and revalidate schema, authored evidence, semantics, relationships and component identity on read/write. Low-level cache calls require an explicit validator. Cancellation propagates; transient classifier validation failure leaves the entry intact and returns a miss. The package root does not export cache functions and there is no production cache consumer; validate that integration when one is introduced. |

Do not mark an unqualified head as qualified, lower classifier thresholds, add
hidden status values, publish an API-2 VSIX against the API-1 dev.6 package, or
weaken the fail-closed linked-domain behavior to make the gates appear green.
The development-publication staging command also runs the packed release gate
before creating a new archive, so the current unqualified v2 comparison head
cannot be restaged as a new version. The standalone model adapter preserves
each head's declared classifier output contract.

## Local packed-artifact smoke, not a qualification result

The latest local package was packed and installed in an isolated prefix;
its tarball SHA-256 was
`fec2b5f495d6b544a0d701b3708c9f6fbb99d41817d76bb3aa3e56b2d5459182`.
The pinned dev.6 tarball was rerun under the same Node 22 runtime, generic
one-row EDMX, seed 42, auto mode and 3-second SFT budget. Native model loading
and two consecutive generations succeeded in both packages:

| Artifact | First generation | Second generation | Approx. peak reported RSS |
| --- | ---: | ---: | ---: |
| dev.6 (API 1) | 1,634 ms | 104 ms | 514 MB |
| Current local package (API 2) | 1,901 ms | 65 ms | 764 MB |

These are single-process smoke timings, **not** warm medians or BAS evidence.
The current sample is slower cold and faster warm, with higher observed RSS;
it does not establish the required <=10% warm-median or memory gate. The
isolated pnpm 11 install warned that the ONNX lifecycle build was ignored, but
native inference completed; this does not replace the BAS Linux platform gate.
The current smoke had zero accepted classifier decisions and one accepted SFT
value slot; its domain meaning was correctly reported `synthetic-unverified`.

## Historical name-evidence comparison

The old `sap-ai-mockserver` implementation did **not** obtain the shown status
behavior from a broadly successful classifier. Its
`packages/mockgen-core/src/generation/semantic-tier-resolver.ts` recognized
status/state code-list entity shapes and filled linked code/text fields from a
bundled status bank. Its `observed-name-hints.json` has no `bookingstatus` or
status-text entry; `overallstatus` has only two observations from one source
and maps to `order_status`. That is insufficient evidence for a new general
runtime rule or authoritative status vocabulary. This comparison should guide
reviewed training examples and structural evaluation, not be copied into the
standalone generator as hidden hardcoding.
