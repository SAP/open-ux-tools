# Performance plan v2: pre-registration of metrics, floors and the release rule

Registered 2026-09-24, before any runtime change of phases P1, P5 and P7. Definitions, protocol and
decision rules below are fixed; the section "Baseline values" is appended once, from the P0 baseline
runs, and is never edited afterwards. Later results are reported against it, not substituted for it.

## Protocol

- **Harness**: `evaluation/tier-benchmark.mjs` (format `mockgen-tier-benchmark` version 2). One inspection
  pass per service with the package's own learned runtime; the fine-tuned generator is wrapped only to
  observe its calls (answers, native forward passes, time). Rows, tiers, field decisions and model
  statistics come from the same execution.
- **Corpus**: the 135 EDMX/CSN services of
  `sap-ai-mockserver/var/ml-native/recovery-v34-generator-calibration-ready-v2/registry.json`
  (sha256 `1a6a05dc…3f8e`). The 4 approved `s4-fin-local-*` services whose sources cannot be read are
  **failures**, not silently skipped; every rate is over the 131 generated services and the failures are
  listed.
- **Profiles**: `two-row` (2 rows, seed 123, the package's default fine-tuned budget) and `editor`
  (10 rows, seed 1, `sftTimeoutMs` 30000, `sftBudgetMs` 20000: the settings of the data editor's
  `worker-core.ts`). The editor profile is the headline.
- **Execution**: variants are compared with `evaluation/interleaved-benchmark.mjs`: all variants run on
  the same chunk of 4 services before the next chunk, rotating which variant goes first, so each variant sees
  the same machine load (other agents train models on this machine). Within a chunk, services run
  sequentially with one warm runtime per process. Model load time is reported separately
  (`host.modelLoadMs`). The 1-minute load average is recorded at the start and end of every service; a
  comparison whose variants differ by more than 30% in median load is re-run before it is reported.
- **Old releases** are measured from scratch copies of the published npm tarballs whose
  `valueTierStatistics` carries two read-only hooks (per-field tier, model statistics); the summary
  records `tierSources: ["hook"]`. Builds from this branch report `["inspection"]`.
- **Realism** (M8): `evaluation/realism-judge.mjs`, protocol `mockgen-realism-v1`, on the editor-profile
  rows of 60 fixed public services (sha256 order of `mockgen-realism-services-v1:<id>` over the 131
  readable public services; `evaluation/realism-services.json`), 2 entities per service chosen by name, first 25
  columns, 10 rows. Two judges (`anthropic--claude-4.8-opus`, `anthropic--claude-4.6-sonnet`), blinded,
  items of all variants interleaved, temperature 0, one 0/1 verdict per column. A column's tier is the
  fine-tuned tier when it wrote at least half the cells, else the tier of its other cells.
- **Robustness sweep** (M9): the 2,300 metadata files of the release sweep, editor request with a 1 ms
  fine-tuned budget, compared file by file with the dev.21 sweep.

## Metrics, floors and targets

Denominator for shares: generated slots minus structural (foreign-key) slots.

| #   | Metric (harness field)                                                                                                   | Floor                                                                | Target           |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------- |
| M1  | Recognised share, two-row (`shares.recognised`)                                                                          | ≥ dev.20 under this protocol                                         | ≥ 58%            |
| M2  | Fine-tuned slots, two-row (`totals.model`)                                                                               | ≥ dev.17 under this protocol                                         | ≥ 5,000          |
| M3  | Generic-typed share, two-row (`shares.genericTyped`: typed minus keys, booleans, protocol sets and guid/date/time types) | ≤ dev.20                                                             | ≤ 10%            |
| M4  | **Editor profile**: typed share (`shares.typed`), generic-typed share, realism (M8)                                      | typed ≤ 40.02% and ≤ dev.20 under this protocol                      | typed ≤ 30%      |
| M5  | Fine-tuned answers (`llm.validCellRate`, `llm.atCapRate`) and M8 realism of model-tier columns                           | ≥ 99%, ≤ 6.4%, ≥ dev.20                                              | 99%, ≤ 3%, ≥ 50% |
| M6  | Head B precision and accepts                                                                                             | not changed by these phases; reported as measured by the head-B work |                  |
| M7  | Head A qualification                                                                                                     | not changed by these phases                                          |                  |
| M8  | Realism: mean over judges of the share of realistic columns, overall and per tier                                        | ≥ dev.20                                                             | +15 points       |
| M9  | Sweep: 0 new failures; editor contract 3/3; no throw when the LLM is unavailable                                         | as stated                                                            |                  |
| M10 | Time per service: median and p90, both profiles                                                                          | ≤ dev.20                                                             | ≤ dev.17         |

Premise corrections (bisect, 2026-09-24): `sft-runtime`, `sft`, the grammar, the sampler, the ONNX session,
`generation-config.json` and the LLM weights are byte-identical from dev.17 to dev.20; field chunking was
already disabled under the semantic-v2 planner in dev.17. The committed dev.20/dev.21 tier records overlapped a
5-shard sweep and are not valid for M2 or M10. The M2 floor is therefore dev.17 **re-measured under this
protocol**, not the committed 3,278.

## Release and keep/revert rule

- A runtime change is **kept** only when, on the full corpus, it improves at least one of M2, M4, M5, M8 or
  M10 and breaks no floor, the package tests and lint pass, and the robustness sweep has 0 new failures.
  Otherwise it is reverted and the measurement is recorded as a negative result.
- During development a change may be screened on a fixed 12-service subset
  (`evaluation/screening-services.json`); screening never replaces the full-corpus decision.
- A release candidate must meet every floor above; a missed floor is reported, never re-defined.

## Baseline values

Appended 2026-09-24 from the P0 baseline runs (published tarballs, interleaved, chunks of 4 services).
Other agents trained models on the machine throughout; median 1-minute load is given per run.

**Two-row profile, full corpus** (131 generated, 4 unreadable = failures; load 17.0 / 17.5 / 19.0):

| Metric                                                   |                   dev.17 |                   dev.20 |                   dev.21 |
| -------------------------------------------------------- | -----------------------: | -----------------------: | -----------------------: |
| M1 recognised share                                      |                   54.00% |                   54.00% |                   51.73% |
| M2 fine-tuned slots                                      |                    2,712 |                    2,743 |                    2,688 |
| typed share                                              |                   28.49% |                   28.35% |                   30.87% |
| M3 generic-typed share                                   |                   12.81% |                   12.67% |                   15.19% |
| typed split (keys / protocol / guid-date-time / generic) | 2,826 / 56 / 588 / 2,836 | 2,826 / 56 / 588 / 2,805 | 2,826 / 56 / 588 / 3,362 |
| M5 valid cells / at-cap strings / null                   |      98.9% / 4.1% / 3.3% |      98.6% / 3.9% / 4.1% |     97.1% / 12.4% / 0.8% |
| M10 median / p90 ms per service                          |           3,666 / 20,481 |           3,837 / 20,059 |           4,865 / 19,361 |

**Editor profile, partial**: the run was stopped when the machine began swapping (load 95–146); it covers
the first 64 services of the corpus (60 generated, 4 unreadable) for all three releases (load 25.8 / 38.8 / 37.8):
typed share 37.54% / 37.07% / 40.39%, generic-typed 22.37% / 21.90% / 25.21%, fine-tuned slots
2,080 / 2,303 / 2,040, recognised 55.21% / 55.21% / 52.45% (dev.17 / dev.20 / dev.21). Final comparisons
re-measure dev.20 and dev.21 interleaved with the candidate.

**Resulting floors**: M1 ≥ 54.00%; M2 ≥ 2,712 (dev.17 under this protocol); M3 ≤ 12.67%; M4 typed ≤ 40.02% and
≤ dev.20 in the same interleaved run; M5 valid ≥ 99% and at-cap ≤ 6.4%; M10 ≤ dev.20 in the same run.

**Bisect result**: dev.17 and dev.20 give the same fine-tuned tier (2,712 vs 2,743 slots, eligible 3,866 vs
3,872) under equal load; the committed dev.20 record (1,368) was depressed by a concurrent sweep.
