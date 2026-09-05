# Mockserver data generator realism cohort

This directory freezes the metadata-only inputs used by the production realism
campaign. `final-cohort-v1.json` retains the original routing baseline.
`final-cohort-v2.json` keeps the same service selection, metadata bytes,
relationship assertions, and isolation evidence while refreezing T2 routing
after the generator learned to consume SAP labels, data elements, and field
control references. `final-cohort-v3.json` keeps those inputs and assertions
unchanged while refreezing T2 routing after governed SAP audit-user, boolean,
organization-name, accounting-chart, equipment, short-control-code, and
numeric-status semantics were added. Generated rows, model outputs, and human
or LLM reviews must remain outside the repository.

The manifest records the exact source repository, commit, repository path, Git
blob, byte count, and SHA-256 for every schema. The six inputs come from these
Apache-2.0 repositories:

- `SAP/open-ux-odata` at `d94d8d3c31bb770e267784e0011aee5fb7e361a6`
- `SAP-samples/btp-procurement-data-extractor` at `77f0967441bea346762e412272ea657d23785f9e`
- `SAP/open-ux-tools` at `6879d47df9097421fd98edf0800eb13c2c513aa9`

The CSN fixture is a compiled representation of the bound CDS source. Its
content hash, provenance, and source path are frozen in the manifest. See each
upstream repository's `LICENSE` file for the Apache-2.0 terms.

Both cohort versions are intentionally disjoint from the pilot classifier/SFT training,
validation, review, and model-selection inputs. The exporter verifies those
inputs and recomputes the service/source-family isolation contract before model
inference. Each manifest also freezes every service's raw T2 completion
attempts, parsed responses, eligible slots, and accepted slots. A replay fails
before publication when any of those denominators or contributions drift. The
v2 and v3 routing baselines were each frozen before exporting or judging their
corresponding metadata-grounded candidates; neither is a relaxation of the
parse, fill, or structural thresholds.
