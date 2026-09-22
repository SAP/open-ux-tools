# MockGen papers

Two papers describing the standalone MockGen package end to end: how it
turns a service definition into a complete, relationally consistent mock
dataset offline, and how the learned role recogniser fits into that
pipeline.

| File | Format | Length | Scope |
| --- | --- | --- | --- |
| `main.tex` | IEEEtran journal | 7 pages | Whole system: schema IR and adapters, the four-tier cascade (declared catalogs, recognised roles, local language model, typed floor), relational passes and coherence groups, determinism and caching, packaging/qualification/editor integration, the learned recogniser and its routing policy, corpus and sealed benchmarks, the relevance-verifier negative result, limitations. |
| `conference.tex` | IEEEtran conference | 4 pages | Condensed whole-system account: the cascade, the two recognition design findings, the routing gates, corpus + sealed + scaling results, the negative result. |

## Numbers

`numbers.tex` is the single source of truth for every measured value;
both papers read it. A bare metric in either body is a review defect.
Each macro carries a source-path comment pointing at the evidence file
it came from — either a baseline under
`scripts/mockserver-data-generator-training/baselines/` or the private
evidence directory outside this repository.

Corpus and scaling numbers come from two harnesses in the package:

```sh
node packages/mock-data-generator/evaluation/corpus-benchmark.mjs   --help
node packages/mock-data-generator/evaluation/scaling-benchmark.mjs  --help
```

Their outputs are recorded as dated baselines. The corpus is swept three
ways, because field resolution and generation cost are separate
questions:

| Baseline | What it measures |
| --- | --- |
| `2026-09-21-corpus-benchmark-learned.json` | The whole pipeline, language model at its packaged service budget. |
| `2026-09-21-corpus-benchmark-recognition.json` | The recognition path: same run with the language model given a 1 ms budget so it never fires. Field resolution is identical to the run above; only the timings differ. |
| `2026-09-21-corpus-benchmark-deterministic.json` | Recognition disabled entirely — the contribution of the learned tier, and its effect on robustness. |

Scaling comes from `2026-09-19-scaling-benchmark.json`.

## Figures

Five TikZ/pgfplots figures live in `figures/src/` and are built into
`figures/out/` as PDF and PNG. They read `numbers.tex` too, so a metric
shown in a figure stays in sync with the body.

| Figure | Shows |
| --- | --- |
| `fig-cascade` | The four tiers resolving one column, with the typed floor that cannot decline. |
| `fig-components` | What ships where: editor extension, pinned package, shared verified module cache. |
| `fig-recognition` | One column becoming a routed role: sentence rendering, frozen encoder, head, three gates. |
| `fig-resolution-bars` | Field resolution across the corpus with and without the learned tier. |
| `fig-scaling` | Generation time versus generated rows on a 17-entity service. |

Build the figures before the papers (the papers include the PDFs):

```sh
cd figures && ./build-figures.sh
```

## Build

```sh
latexmk -pdf main.tex
latexmk -pdf conference.tex
```

Both compile with no undefined references or citations.
