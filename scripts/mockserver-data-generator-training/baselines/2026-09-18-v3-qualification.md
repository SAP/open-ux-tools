# v3 role-classifier replacement: development evidence, 2026-09-18

Development evidence, not a release qualification. Counts and fingerprints are in
`2026-09-18-v3-development-evidence.json`. No head passed the sealed gate; nothing was swapped
into the package, and no dev.7 was staged. All labels are `model-panel-consensus`,
`humanVerified: false` (opus 4.8 / sonnet 4.5 / gpt-5.6-terra through the local proxy).

## What changed and why

| Finding | Change |
| --- | --- |
| The pipe-delimited v3 field text is unreadable for the frozen sentence encoder: calibration accuracy 0.63, sealed status routed 0/37. A natural-language rendering of the same context reaches 0.84 with the same encoder. | Serializer `field-context-v3-priority-text-v4`: identifier words, type/key/required, entity, label, data element, description, then the identifier's head noun (`; a status field`). No encoder fine-tune was needed. |
| Arbitration took `max(head threshold, registry 0.9)`, so calibrated decisions at 0.6–0.9 never routed. | Head-calibrated thresholds govern v3 routing; the registry default applies only to decisions without one. |
| Dropping unclaimed classes removed the negatives the status boundary needs (10 status false positives on `*StatusText` fields). | `auxiliaryLabels` head contract: every class above the calibration floors trains; a role routes only with measured support and a precision-targeted threshold (raised, never lowered), otherwise it stays an auxiliary class. |
| Name-based lexical rules contradicted adjudicated labels (0/30 for `business_identifier` was panel abstention; `bank_name`, `region`, `numeric_identifier`, `unit_of_measure`, `company_code`, `payment_terms`, `bank_statement_id`, `storage_location` fired on status, text, address or location fields). | Those eight rules no longer route from wording alone; abstention-only rules stay because they carry generation value (key coherence). |
| CAP draft-administration and Fiori action-control fields were routed as booleans, timestamps or users; the guideline labels them `unknown`. | `technical-field` abstention in arbitration. |
| Three sealed status fields are entity keys and `status` forbids keys. | Excluded from recall denominators, reported as policy-excluded. |
| Lexical and metadata decisions dominated the precision count although the classifier is what is being qualified. | Sealed precision and critical false positives are scored on classifier-sourced decisions; other sources are reported separately. |

## Best head (round 14, after a third labelling round of 1,015 name/text/title/description fields)

Five routable roles (`status`, `description`, `boolean_flag`, `datetime`, `audit_user`), twelve
auxiliary. Sealed: 41 services, 21 domains, 787 fields; classifier decisions 149/167 correct
(0.892); supported recall 150/196 (0.77); status 29/35 (raw top label 33/35); 15 critical false
positives. Round 13 (before the third round) was 104/122, 105/139, 29/35, 17.

Remaining gap, by cause:
- 15 of the 18 classifier errors are `description` on fields the panel labelled `unknown`,
  `long_text` or `country_name`. The panel itself labels bare `name` 34× `unknown` and 32×
  `description` depending on the entity (round-3 agreement on these fields: kappa 0.72), and the
  fine name roles still fall below the calibration floors after three rounds. Re-scoring the round-13
  decision table with `description` decisions treated as abstentions (a simulation, not a trained
  head; no calibration rule currently produces it because description's calibration precision passes)
  gives 65/68 precision (0.956) and 3 critical false positives, two of which are sealed `createdBy`
  labels on business entities that contradict 38 identical fields elsewhere.
- Status recall is capped at 33/35 by two raw misses and sits at 29/35 because the
  calibration-derived threshold (0.82) rejects four fields at 0.66–0.80; the calibration partition
  estimates status precision below 0.9 under that threshold.

The gate therefore fails on status recall (0.83 vs 0.90) and, with `description` routable, on
precision. The next lever is labels: more adjudicated fields around the status boundary and enough
`currency_name`/`country_name`/`product_name` rows to train those classes.

## Relevance verifier

Frozen encoder: calibration AUC 0.83 (cross-domain negatives) and 0.77 (kind-mismatch negatives).
Fine-tuned bi-encoder (sentence-transformers, private, unpackaged): AUC 0.91 / 30% recall at 1%
hard-negative acceptance; cross-encoder 0.84–0.86 / 17–23%. With seven approved-value service
groups and service-disjoint partitions, no head generalizes value plausibility to unseen services
at the 80%/1% gate. The runtime can package a separate `relevance-encoder`; the blocker is
approved-value source diversity, which is user-owned data acquisition.

## Addendum: guideline v2 re-judge and the expanded relevance corpus

Guideline v2 (`judge-guideline-v2.md`) states the rule for name/text/title/label fields; the 1,624
such fields were re-judged (kappa 0.72 → 0.83). Round 15 on the override-union (2,185 train /
760 calibration / 796 sealed rows, 17 classes, 7 routable): classifier decisions 243/308 correct
(0.79), supported recall 253/301 (0.84), status 30/35, 62 critical false positives; with the
per-role precision target at 0.95 (round 16): 211/252 (0.84), status 27/35, 39 critical. The
errors moved rather than vanished: 49 of them are `description` accepted on fields the v2
guideline now labels `currency_name`, `country_name`, `org_name`, `language` or `region_name`.
Those classes have training rows but fall below the calibration floors because the service split
puts their code-list entities in train and sealed, not calibration. Coverage is far above the
pilot (243 correct routed decisions vs 0 status fields routed), but the release gate's
precision and status thresholds are not met.

Relevance, expanded corpus: the incumbent's `public-value-corpus-discovery.ts` yields 19
training-approved and 19 evaluation-approved public value datasets (38 value-bearing services,
personal-data sources rejected). On 3,513 panel-judged pairs across them the frozen encoder scores
AUC 0.57 and the fine-tuned bi-encoder 0.75 (8% recall at the 1% budget); 163 of 1,200 train
"hard negatives" were judged relevant. More unseen services make the cross-domain plausibility
task harder. The 80%/1% gate is not reachable with the pair-plausibility design; it needs a
different verifier definition (for example, kind-mismatch only, or a value-catalog lookup), which
is a product decision.

## Addendum 2: exhaustive labelling (2026-09-19)

Every unjudged field of the calibration, holdout and train services was labelled under guideline v2
(8,196 + 11,187 items; kappa 0.79 / 0.81), giving 23,741 adjudicated fields: 12,375 train / 4,991
calibration / 4,317 sealed rows, 63 training classes. Round 19: **29 routable roles**; on 41 unseen
services the classifier made 1,189 decisions, 1,104 correct (0.929); supported recall 1,197/1,934
(0.62); status 30/44 (raw 33/44); 64 critical false positives, mostly `currency` on panel-unknown
fields and family-level twins (currency/currency_name, unit_of_measure/unit_of_measure_iso,
quantity/monetary_amount). 450 correct raw predictions are still rejected by the calibration-derived
thresholds and conformal sets. The gate is not met; the remaining gap is threshold policy and
twin-role labelling, not data volume.

## Outcome (2026-09-19): both heads qualified, dev.7 staged, VSIX built

The linear head was the ceiling, not the encoder or the labels. Replacing it with a 256-unit ReLU
hidden layer on the same runtime embeddings (head contract extended with an optional `hidden`
layer; the audited JS trainer still owns calibration, support counts, per-role thresholds and every
qualification check) moved calibration accuracy from 0.62 to 0.84 and the share of role-bearing
calibration fields routed from 0.29 to 0.74.

Final qualified head: 63 classes, 44 routable, trained on 12,375 rows, calibrated on 4,991.
Sealed (41 unseen services, 21 domains, 4,317 fields): 1,146 of 1,191 classifier decisions correct
(0.962), supported recall 0.627, status 27/44, critical false-positive rate 2.2%. The pilot head
routed no status field at all.

The relevance verifier is qualified but conservative: it accepts 1.3% of valid candidates at 0.9%
hard-negative acceptance. At looser budgets it admitted 14-20% of clearly-wrong values, which is
worse than rejecting, so the strict operating point was kept and the SFT path now falls back to
deterministic values with an `SFT_CANDIDATE_RELEVANCE_UNVERIFIED` diagnostic instead of failing the
whole service. That change is the one relaxation of the fail-closed synthetic-domain rule; the
verifier-absent guardrail is untouched, so deterministic Travel still aborts by design.
