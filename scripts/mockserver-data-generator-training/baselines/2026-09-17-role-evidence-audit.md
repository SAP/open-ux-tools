# Role-classifier migration evidence, 2026-09-17

This is a development audit, not a release qualification. The immutable comparison
identities are in `dev6-application-modeler-1.48.0.json`. The installed dev.6
tarball and current source head both hash to
`dcf20dc38dd615075e216e4411cc01cb39781c66a368320172c1e0671aa7eb2a`.

## Existing role judgments

| Source | Rows | `order_status` | Status source services | `REVIEW_ME` |
| --- | ---: | ---: | ---: | ---: |
| Incumbent real-service train pool | 82,006 | 6 | 1 | 8,613 |
| Incumbent real-service calibration | 510 | 0 | 0 | 0 |
| Incumbent internal evaluation | 52,555 | 7 | 2 | 7,565 |

All six training `order_status` judgments use the broad
`internal:webapp/localService/metadata.xml` source alias, which also covers
30,714 training rows. The alias is not a checksum-bound identity for one
original service graph. The offline converter therefore requires an explicit,
unique source/schema binding before admitting these rows; their presence in
the old pool alone does not establish usable v3 training evidence.

The incumbent synthetic corpus has 387 `order_status` training rows but its
validation contexts overlap training contexts and carry no service identities.
It is training augmentation only, not calibration or sealed evaluation.
The v49 planner `semanticUnknown` flag describes a missing value-planner
descriptor; it is not an `unknown` role judgment. The converter formerly
misused it as one and now excludes it from role labels.

Checksum-verified metadata from the canonical v49 registry yielded a pending
queue of 45 status-shaped fields across 19 public holdout services, eight
business-domain families, and 38 distinct v3 serialized contexts. Fourteen
have prior planner review, but none has an adjudicated classifier-role label
in this queue. The queue is at
`../review-queues/public-holdout-status-pending.json`; it contains structural
field context, no authored or generated values, and cannot be used as a sealed
role evaluation until its roles and support status are reviewed.

The same checksum-bound source registry yields 80 pending public
training/calibration status fields (72 train, eight calibration) across 29
services. With the registry's existing structural-metadata-only owner
authorization and passed privacy reviews, a private temporary queue yields
702 pending fields (528 train, 174 calibration) across 85 services. Only 50
of those have prior planner review; that review does not assign a semantic
classifier role. The private queue was kept outside this repository and the
npm package. These are existing-source review candidates, not a request for
new services or permission to treat unlabeled fields as `order_status`.

## Paired fixed-input development replay

Both artifacts used empty authored data, seed `123`, one row per target,
`mode=auto`, and the same fixture metadata and target sets. Only privacy-safe
counts and role decisions were recorded.

| Artifact | Service | Targets | Eligible fields | Routed fields | Outcome | Elapsed |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| dev.6 | Travel V2 | 28 | 176 | 64 | learned inspection completed | 10.7 s |
| current source | Travel V2 | 28 | — | — | `SFT_CANDIDATE_VERIFIER_UNAVAILABLE: Airline`; no output saved | 1.4 s |
| dev.6 | SFlight V4 | 23 | 149 | 49 | learned inspection completed | 14.6 s |
| current source | SFlight V4 | 23 | 149 | 51 | learned inspection completed | 14.0 s |

The current SFlight inspection shows `BookingStatus_code` with raw
`unknown=0.967594` and `TravelStatus_code` with raw `unknown=0.994024`.
The pilot's best non-abstention labels were `company_code` and `postal_code`
at 0.005657 and 0.000868 confidence respectively; arbitration correctly
abstained. In a direct batch over all 45 pending public status contexts,
`unknown` was the raw top label for 45/45, with zero non-abstention choices
above 0.4. The incumbent observed-name lookup had exact-name
`order_status` hints for 12/45; that is a diagnostic clue, not evidence to
reintroduce it as runtime routing.

## Release decision

The bundled pilot head is still v2, includes `REVIEW_ME`, and has no sealed v3
qualification. No field-to-value relevance head is packaged. The package
check reports `publicationRightsApproved=false`. The required 30 distinct,
role-reviewed unannotated status fields from four services and two domains
have not been established. The standalone release gate therefore fails, and
there is no qualifying replacement model or new VSIX to publish. The
package-level `realismReady=true` flag is unchanged; it is not run-level or
release-level evidence.

## Changed-package verification

The generator build, 46 package suites (443 tests), 56 offline-training tests,
package integrity check, and changeset validation pass. Package lint has zero
errors and 844 warnings. The packed `--release` check correctly rejects the
current unqualified v2 head. No npm package or VSIX was produced from this
unqualified state.

The release check also requires a checksum-verified relevance head whose
encoder/tokenizer/serializer contract matches the packed classifier and whose
service-disjoint sealed results meet the positive-acceptance and hard-negative
limits. The current package has no such head, so it remains release-blocked
even after the role classifier is replaced.
