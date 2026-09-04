# Mockserver data generator model evaluation

This record captures the 2026-09-04 development campaign that exercised the production `@sap-ux/mockserver-data-generator` runtime against the existing MockGen pilot artifacts. It is implementation evidence, not a release attestation. Model weights, pilot datasets, provider outputs, and generated values remain outside `open-ux-tools`.

## Fixed inputs

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| MiniLM INT8 encoder | 22,972,370 | `afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1` |
| Calibrated classifier head | 515,713 | `dcf20dc38dd615075e216e4411cc01cb39781c66a368320172c1e0671aa7eb2a` |
| Classifier vocabulary | 231,508 | `07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3` |
| Classifier gold cohort | 132,260 | `0d1d0a5c305083fb17e7bbe3149c828037616898e5464a8d6993818fd94fb6b3` |
| SFT INT8 generator | 164,924,986 | `8241c95937623d6b5e61e6057f85e3ab5ede22a2bc0e57f221092db9bc8011da` |
| SFT INT4 generator | 200,835,311 | `b77024628431064253c512fd3d76518f6216513658808a4a472480c689cb343a` |
| SFT tokenizer | 3,522,755 | `a98e682ef5e06816223674214ebc23ea06a80e31ef8e7f45d1468c04ddd17905` |
| SFT held-out prompt cohort | 42,307 | `83dd7d4e1613a17715d9c5bce8e1aea43b505f0d6d6afb7d09993d8049c0c5d4` |

The classifier cohort contains 300 records. The harness evaluated the 233 direct LLM agreements or verifiable human adjudications and quarantined 67 records whose `human_adjudicated` label describes automated adjudication in its own rationale.

## Production runtime results

The classifier ran through the package's MiniLM, pooling, calibrated linear-head, and abstention implementation:

| Metric | Result |
| --- | ---: |
| Eligible cases | 233 |
| Top-1 accuracy | 38.63% |
| Macro F1 | 30.73% |
| Routed coverage | 29.18% |
| Routed precision | 83.82% |
| Model-session load | 113.49 ms |
| Per-field p50 / p95 | 0.65 / 0.96 ms |

The classifier is therefore retained as a calibrated high-precision router. It is not used unconditionally: low-confidence fields continue to the fine-tuned SFT tier or deterministic fallback.

The first production SFT pass exposed two adapter defects rather than a need to discard or retrain the pilot model:

1. 37–60-field finance entities exceeded the single 400-token decode budget.
2. The JSON grammar constrained object shape but admitted invalid numeric/boolean/null literal continuations.

The runtime now partitions wide residual field sets into deterministic groups of at most 16 and uses a strict JSON-literal DFA. The same INT8 model, tokenizer, cohort, sampling settings, and seed then produced:

| Metric | Result |
| --- | ---: |
| Held-out cases | 16 |
| Requested scalar slots | 261 |
| Parse success | 100% |
| Exact-key success | 100% |
| Filled requested fields | 259 / 261 (99.23%) |
| Failed cases | 0 |
| Generation p50 / p95 | 1.59 / 16.69 s |
| Session load | 0.79 s |
| Output fingerprint | `9b97cd178c9336617e6554bace5ea9fcf0e71d4301042b85180f6896c846c92c` |
| Judge-evidence SHA-256 | `2c74596bffa8390ba48d1c568f86fcdfc35f791b5cd7d2367b0339bdb737865c` |

An independent identical-seed replay produced the same output fingerprint and evidence SHA-256. Its p95 was 16.77 seconds. This clears the fixed development gates of at least 99% parse, at least 95% fill, deterministic replay, and a 20-second SFT budget on `darwin-arm64` with Node 22.22.3. The larger final cross-platform and integrated structural campaign remains required before promotion.

## Size and quantization decision

The final reviewed npm package contains no weights and packs to 49,045 bytes, far below the 5 MiB ceiling. Model and runtime footprints are reported separately:

| Candidate | Model bytes | Development result | Decision |
| --- | ---: | --- | --- |
| Dynamic INT8 | 164,924,986 | 100% parse, 99.23% fill after adapter corrections | Retain as current candidate |
| Weight-only INT4 | 200,835,311 | Larger than INT8; prior fixed pilot gate recorded 33.33% symmetric or 66.67% asymmetric parse and substantially lower fill | Reject |
| FP32 | 652,552,120 | Exact runtime contract, but 3.96 times INT8 bytes | Reference only; do not distribute |

The INT4 graph is 21.77% larger than INT8 because its MatMul-only quantizer did not cover the 113.25 MB embedding matrix. It cannot be a Pareto winner even before its historical quality regression is considered. Future size work should prioritize a calibrated export that covers embedding/output matrices, quantization-aware training, vocabulary pruning, distillation, or a smaller fine-tuned architecture. Every new candidate must rerun the same structural and realism gates.

## WASM decision

The installed ONNX backend allocation in this development checkout was about 220,454,912 bytes for `onnxruntime-node` and 134,881,280 bytes for `onnxruntime-web`. Holding the 192,167,332 model/tokenizer/classifier bytes constant gives a product-total reduction from 412,622,244 to 327,048,612 bytes (20.74%). The backend-only reduction clears the preliminary 25% screen, so identical classifier artifacts were benchmarked before attempting the much longer autoregressive campaign.

| Backend | Load | p50 | p95 | Process max RSS |
| --- | ---: | ---: | ---: | ---: |
| Native | 50.18 ms | 0.64 ms | 1.85 ms | 174,211,072 bytes |
| Web/WASM | 161.77 ms | 2.99 ms | 5.38 ms | 351,846,400 bytes |

Web/WASM p95 was 2.90 times native and its process maximum RSS was about twice native. It fails the frozen 1.5-times latency gate at the bounded classifier screen. The WASM product branch is therefore a no-go; no autoregressive WASM or packaging implementation is justified.

The native runtime total is dominated by `onnxruntime-node` shipping every
supported operating-system and architecture binary in one npm package. The
allocated binary subtrees measured 36,204,544 bytes for darwin-arm64,
35,553,280 for linux-x64, 19,025,920 for linux-arm64, 62,181,376 for
win32-x64, and 67,354,624 for win32-arm64. Only one subtree is used by a given
installation. ONNX Runtime does not expose a supported CPU install flag that
removes the other bundled platform binaries; its install flag controls
additional downloaded execution-provider assets.

The production package therefore keeps `onnxruntime-node` as an optional peer:
deterministic installations remain about 49 KB plus ordinary JavaScript
dependencies, while learned-mode users explicitly add the runtime and external
model cache. Deleting files from a consumer's `node_modules` in a postinstall
hook is not an acceptable production optimization. A future platform-specific
runtime distribution can reduce a learned installation substantially without
changing the model or accepting the observed WASM regression, but it must be a
supported upstream package or a separately maintained, licensed artifact with
the same compatibility and integrity tests.

## Realism status

The existing two-provider pilot report remains useful historical evidence: 60 fields across six domains were reviewed, 16 were rated realistic (26.67%), 10 provider disagreements were recorded, no critical issues were found, and the report failed its gate. It is not silently promoted or discarded.

The corrected production candidate still requires a fresh blinded judge run bound to output fingerprint `9b97cd178c9336617e6554bace5ea9fcf0e71d4301042b85180f6896c846c92c`. Until that run passes, structural/model-runtime readiness must not be described as proven realism.

## Reproduce

See [the evaluation harness](../../scripts/mockserver-data-generator-evaluation/README.md). Reports contain hashes and aggregate metrics but no generated values or absolute pilot paths. Exact candidate outputs for judging are emitted only to an explicitly supplied external evidence directory.
