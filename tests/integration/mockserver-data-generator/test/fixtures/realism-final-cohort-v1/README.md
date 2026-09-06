# Mockserver data generator realism cohort

This directory freezes the metadata-only inputs used by the production realism
campaign. `final-cohort-v1.json` retains the original routing baseline.
`final-cohort-v2.json` keeps the same service selection, metadata bytes,
relationship assertions, and isolation evidence while refreezing T2 routing
after the generator learned to consume SAP labels, data elements, and field
control references. `final-cohort-v3.json` keeps those inputs and assertions
unchanged while refreezing T2 routing after governed SAP audit-user, boolean,
organization-name, accounting-chart, equipment, short-control-code, and
numeric-status semantics were added. `final-cohort-v4.json` again changes only
the routing baseline after the pilot-governed plant and stock-batch roles were
restored. `final-cohort-v5.json` changes only the SFT acceptance baseline after
symbol-only, non-enum string candidates were rejected before deterministic
fallback. Its 435/462 accepted-slot preflight is retained as a failed gate.
`final-cohort-v6.json` strengthens constrained decoding so every generated
non-enum string contains a letter or number, while retaining post-generation
validation as defense-in-depth. `final-cohort-v7.json` keeps the six services,
field selection, metadata, and assertions unchanged while refreezing routing
after relationship-aware key generation, corrected lifecycle and draft-state
checks, machine-structured values were removed from SFT, and SFT strings were
bounded to 80 characters. Its preflight records 86/86 parsed responses and
307/312 accepted slots. `final-cohort-v8.json` refreezes T2 routing after the
remaining governed business-code roles were restored. `final-cohort-v9.json`
clarifies the exact bank-balance equation, adds governed bank-statement fields,
and records the narrower, fully accepted SFT route. `final-cohort-v10.json`
refreezes that route after service and supplier semantics were governed.
`final-cohort-v11.json` keeps the same services, selected fields, schemas,
relationships, and fully accepted route while binding evaluation to the sales,
maintenance, and finance semantic corrections. `final-cohort-v12.json` retains
that route after correcting the coherent SAP ISO unit codes and Czech mobile
number length. Generated rows, model outputs, and human or LLM reviews must
remain outside the repository.

The manifest records the exact source repository, commit, repository path, Git
blob, byte count, and SHA-256 for every schema. The six inputs come from these
Apache-2.0 repositories:

- `SAP/open-ux-odata` at `d94d8d3c31bb770e267784e0011aee5fb7e361a6`
- `SAP-samples/btp-procurement-data-extractor` at `77f0967441bea346762e412272ea657d23785f9e`
- `SAP/open-ux-tools` at `6879d47df9097421fd98edf0800eb13c2c513aa9`

The CSN fixture is a compiled representation of the bound CDS source. Its
content hash, provenance, and source path are frozen in the manifest. See each
upstream repository's `LICENSE` file for the Apache-2.0 terms.

All cohort versions are intentionally disjoint from the pilot classifier/SFT training,
validation, review, and model-selection inputs. The exporter verifies those
inputs and recomputes the service/source-family isolation contract before model
inference. Each manifest also freezes every service's raw T2 completion
attempts, parsed responses, eligible slots, and accepted slots. A replay fails
before publication when any of those denominators or contributions drift. The
v2 through v7 routing baselines were each frozen before their corresponding
preflight or export. The failed v5 baseline was not exported for judging, and
none is a relaxation of the parse, fill, or structural thresholds.
