# Mockserver data generator model evaluation

This record captures the 2026-09-04 development campaign that exercised the production `@sap-ux/mockserver-data-generator` runtime against the existing MockGen pilot artifacts. It is implementation evidence, not a release attestation. Model weights, pilot datasets, provider outputs, and generated values remain outside `open-ux-tools`.

## Fixed inputs

| Input                      |       Bytes | SHA-256                                                            |
| -------------------------- | ----------: | ------------------------------------------------------------------ |
| MiniLM INT8 encoder        |  22,972,370 | `afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1` |
| Calibrated classifier head |     515,713 | `dcf20dc38dd615075e216e4411cc01cb39781c66a368320172c1e0671aa7eb2a` |
| Classifier vocabulary      |     231,508 | `07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3` |
| Classifier gold cohort     |     132,260 | `0d1d0a5c305083fb17e7bbe3149c828037616898e5464a8d6993818fd94fb6b3` |
| SFT INT8 generator         | 164,924,986 | `8241c95937623d6b5e61e6057f85e3ab5ede22a2bc0e57f221092db9bc8011da` |
| SFT INT4 generator         | 200,835,311 | `b77024628431064253c512fd3d76518f6216513658808a4a472480c689cb343a` |
| SFT tokenizer              |   3,522,755 | `a98e682ef5e06816223674214ebc23ea06a80e31ef8e7f45d1468c04ddd17905` |
| SFT held-out prompt cohort |      42,307 | `83dd7d4e1613a17715d9c5bce8e1aea43b505f0d6d6afb7d09993d8049c0c5d4` |

The classifier cohort contains 300 records. The harness evaluated the 233 direct LLM agreements or verifiable human adjudications and quarantined 67 records whose `human_adjudicated` label describes automated adjudication in its own rationale.

## Pilot evidence reuse audit

The production work does not start a new data or model program. The retained
pilot was audited at the artifact boundary, and each input has an explicit
disposition:

| Pilot evidence | Verified identity | Production disposition |
| -------------- | ----------------- | ---------------------- |
| Classifier judge campaign | 300 labels in `data/pilots/benchmark-gold-judge-full-2026-05-26/final-gold-labels.jsonl`; SHA-256 `0d1d0a5c305083fb17e7bbe3149c828037616898e5464a8d6993818fd94fb6b3` | Reuse the fixed cohort and the 233 direct two-LLM agreements. Keep the other 67 records quarantined because their claimed human adjudication was automated. |
| Classifier encoder, vocabulary, and calibrated head | Exact bytes and hashes listed under fixed inputs | Reuse as the production high-precision routing candidate and preserve abstention. |
| SFT data lineage and training report | `training/sft/data-manifest.json` SHA-256 `df1359ff5f7a6a8e5a1b9ec358c95851cd72d3ee593ac91f34e21f4ce05a718b`; `training/sft/training-report.json` SHA-256 `de2604e6e5f2709482a34063fbb34efa8b2f2f9bfd072e9ee2f3757998e6b52f` | Reuse as private training provenance. Do not copy dataset payloads or local paths into Open UX repositories. No retraining is required for the initial production candidate. |
| SFT held-out evaluation cohort | 16 cases in `training/sft/eval/held-out-prompts.json`; SHA-256 `83dd7d4e1613a17715d9c5bce8e1aea43b505f0d6d6afb7d09993d8049c0c5d4` | Reuse unchanged for adapter correctness, parse, fill, latency, and deterministic-replay gates. |
| FP32 and INT8 export contract | `training/sft/onnx-export-report.json` SHA-256 `1e79460315eca0d292eb1e5ad5034b8f85e2c07427d305223a356e5813614540` | Reuse the INT8 graph as the current learned candidate and FP32 only as the reference export. |
| INT4 quality gate | `training/sft/onnx-export-int4-quality-gate.json` SHA-256 `d048bca6340f8960e5d955709fbe70b74d42f6cdfe7d0afde69908d24b5caac1` | Retain the rejection. Do not rerun the same uncalibrated weight-only INT4 technique; test only materially different quantization candidates. |
| Realism prompt, schema, and selection | `training/review/generation-inspection-prompt.md` SHA-256 `6ecf69aad17021343ca225b21003c9e0a858daae424c25d2a8b31445b5d2b20a`; `training/review/generation-inspection-output.schema.json` SHA-256 `c6192e28bdbe1aec04a9c7e67da69f751dc0ba132fb2d23d04a53f998b2b6e0d`; `benchmark/ml-native/llm-inspection-manifest.json` SHA-256 `202ca3ef76cd1b741bcc4792b22880231f0de3edcbbd58b82bb596fa5288f12f` | Reuse the frozen review contract and multidomain selection. Do not design or recollect a new judging corpus. |
| Independent OpenAI and Anthropic pilot realism judgment | The tracked aggregate status records evidence fingerprint `518c7efd66dfc24cb63bd3259f4c2596ff901a2a38a6b19b290618575f408e33` and report fingerprint `4baca51dcceee8a95f4693a5fb26f0aac3bb0f62e509aa74f8bdb26f0efb9f3a`; the full provider artifacts are not tracked | Preserve as a failed historical baseline: 16/60 realistic consensus, 37 major defects, no critical defects, and 10 disagreements. It must not be rerun merely to reproduce the old result, but the aggregate cannot be recompiled as current evidence. |
| Later pilot multidomain generation replay | 343 fields; evidence fingerprint `00832a6ec51d3c676c486cbf21ca813a25ed7e79dc52906f0d4c2d5c75bd3032`; file SHA-256 `fce4e56600e5edbbbe16f596d9064907fc52b62962bde35ab6bdfd99fc2e42d0` for both original and repeat | Preserve as deterministic historical evidence. It is not a realism verdict and is not bound to the production candidate. |

Only one new realism-evaluation activity remains: two independent providers
must review the exact 307-field production packet described below. Its candidate
and evidence fingerprints differ from the retained pilot packets audited above,
so reusing an old verdict would break evidence lineage. This is a new judgment
over reused inputs and the new production adapter, not new data collection,
classifier training, SFT training, or a repeat of the pilot's historical
judging.

## Production runtime results

The classifier ran through the package's MiniLM, pooling, calibrated linear-head, and abstention implementation:

| Metric              |         Result |
| ------------------- | -------------: |
| Eligible cases      |            233 |
| Top-1 accuracy      |         38.63% |
| Macro F1            |         30.73% |
| Routed coverage     |         29.18% |
| Routed precision    |         83.82% |
| Model-session load  |      113.49 ms |
| Per-field p50 / p95 | 0.65 / 0.96 ms |

The classifier is therefore retained as a calibrated high-precision router. It is not used unconditionally: low-confidence fields continue to the fine-tuned SFT tier or deterministic fallback.

An unchanged-artifact rerun after the generated-service cache landed produced
the same classifier metrics with a 116.91 ms model-session load and 0.921 ms
per-field p95. The SFT rerun again parsed 16/16 cases with exact keys and filled
259/261 fields; its p95 was 16.641 seconds and its output and judge-evidence
fingerprints were unchanged. The cache therefore changed neither retained-model
behavior nor the evaluation output.

The first production SFT pass exposed two adapter defects rather than a need to discard or retrain the pilot model:

1. 37–60-field finance entities exceeded the single 400-token decode budget.
2. The JSON grammar constrained object shape but admitted invalid numeric/boolean/null literal continuations.

The runtime now partitions wide residual field sets into deterministic groups of at most 16 and uses a strict JSON-literal DFA. The same INT8 model, tokenizer, cohort, sampling settings, and seed then produced:

| Metric                  |                                                             Result |
| ----------------------- | -----------------------------------------------------------------: |
| Held-out cases          |                                                                 16 |
| Requested scalar slots  |                                                                261 |
| Parse success           |                                                               100% |
| Exact-key success       |                                                               100% |
| Filled requested fields |                                                 259 / 261 (99.23%) |
| Failed cases            |                                                                  0 |
| Generation p50 / p95    |                                                     1.59 / 16.69 s |
| Session load            |                                                             0.79 s |
| Output fingerprint      | `9b97cd178c9336617e6554bace5ea9fcf0e71d4301042b85180f6896c846c92c` |
| Judge-evidence SHA-256  | `2c74596bffa8390ba48d1c568f86fcdfc35f791b5cd7d2367b0339bdb737865c` |

An independent identical-seed replay produced the same output fingerprint and evidence SHA-256. Its p95 was 16.77 seconds. This clears the fixed development gates of at least 99% parse, at least 95% fill, deterministic replay, and a 20-second SFT budget on `darwin-arm64` with Node 22.22.3. The larger final cross-platform and integrated structural campaign remains required before promotion.

## Retained-pilot production cache bridge

The development bridge was run against the real retained pilot repository and
then checked independently with the packaged production `verify` command. It
staged the same MiniLM INT8 encoder, calibrated head, vocabulary, SmolLM2 INT8
SFT graph, and tokenizer listed above; only the small production runtime config
was derived from the pilot architecture and frozen sampling contract.

| Property                         | Result                                                             |
| -------------------------------- | ------------------------------------------------------------------ |
| Bundle                           | `mockgen-pilot-int8`                                               |
| Lifecycle                        | `development`                                                      |
| Immutable revision               | `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5` |
| Manifest SHA-256                 | `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961` |
| Verified cache bytes             | 192,167,584                                                        |
| Classifier component fingerprint | `1c3ec07345352237fe0a9c5abfea1c74455cea4105c452cb7e4dd61acbb45561` |
| SFT component fingerprint        | `a1502adfda71285d06e0a6efdce0c7b1219395f12476b8da8778d18e06f0fa36` |
| Runtime                          | `onnxruntime-node@1.24.3`                                          |

The production runtime loaded both verified components with no degradation and
generated one OData V4 `Products` row with capabilities `mode=hybrid`,
`classifier=ready`, and `sft=ready`. This proves that the retained pilot assets
fit the production manifest, cache, and inference contracts. It is a local
development canary, not model redistribution clearance or a realism promotion.
The bridge preserves the portable 0.12 pilot's 300-token sampling budget, and
the repository and extracted-pilot layouts produce the same revision and
component fingerprints.

## Size and quantization decision

The reviewed npm package contains no weights and packs below 57 kB in current development canaries, far below the 5 MiB ceiling. Model and runtime footprints are reported separately:

| Candidate        | Model bytes | Development result                                                                                                         | Decision                          |
| ---------------- | ----------: | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Dynamic INT8     | 164,924,986 | 100% parse, 99.23% fill after adapter corrections                                                                          | Retain as current candidate       |
| Weight-only INT4 | 200,835,311 | Larger than INT8; prior fixed pilot gate recorded 33.33% symmetric or 66.67% asymmetric parse and substantially lower fill | Reject                            |
| FP32             | 652,552,120 | Exact runtime contract, but 3.96 times INT8 bytes                                                                          | Reference only; do not distribute |

The INT4 graph is 21.77% larger than INT8 because its MatMul-only quantizer did not cover the 113.25 MB embedding matrix. It cannot be a Pareto winner even before its historical quality regression is considered. Future size work should prioritize a calibrated export that covers embedding/output matrices, quantization-aware training, vocabulary pruning, distillation, or a smaller fine-tuned architecture. Every new candidate must rerun the same structural and realism gates.

## Machine-readable footprint baseline

The production footprint harness measured clean commit
`4112b622e270791eb36fdb61062fc61e8e01a118` on `darwin-arm64` with Node
22.22.2, npm 10.9.7, an Apple M3 Pro, and `onnxruntime-node@1.24.3`. The
package archive SHA-256 is
`34257b290d90a235fd7c24cea10e0c397c5bed38f773c939d3ff4efdac57a76b`.
The report fingerprint is
`a8dc18defd4ef23edda89fff8ce6cd8baa157f91a944bc69ecef41e276286064`
and its file SHA-256 is
`c854408681a417b37ca478f1a7cdc28992faf848cc7fa7363c29beb80c81180a`.

The report is also bound to the exact model-evaluation artifact with fingerprint
`00fb211c1fed99e202cb7dc76a5ea0d69c7ea2d6834a600b733e4d0b82989e58`
and file SHA-256
`e737fd29a00f239ccd60c7dc99d3d5a7665dd8b17d9a9afa8b64caceed2b6a4a`.
That rerun preserved the classifier metrics and the SFT output fingerprint. It
parsed all 16 held-out cases, emitted exact keys for all 16, and filled 259 of
261 requested fields.

| Measurement                         |          Actual |       Threshold | Status       |
| ----------------------------------- | --------------: | --------------: | ------------ |
| npm archive                         |          57,460 |       5,242,880 | pass         |
| npm unpacked                        |         232,410 |               — | measured     |
| Deterministic dependency closure    |       2,116,646 |               — | measured     |
| Learned dependency closure          |     223,778,764 |               — | measured     |
| Native runtime increment            |     221,662,118 |               — | measured     |
| Model transfer                      |     192,167,584 |     209,715,200 | pass         |
| Verified model cache                |     192,167,584 |     209,715,200 | pass         |
| Generated-data-cache quota          |      33,554,432 |      33,554,432 | pass         |
| Total installed and cache footprint |     449,500,780 |     314,572,800 | **fail**     |
| INT8 generator weights              |     164,924,986 |      82,462,493 | **fail**     |
| Provider module-load p95             |         1.64 ms |          250 ms | pass         |
| Model session-load p95               |       807.17 ms |        5,000 ms | pass         |
| T2 generation p95                    |    18,541.78 ms |       20,000 ms | pass         |
| Peak process RSS                     |   1,814,396,928 |               — | measured     |
| Cold whole-service generation        |               — |       25,000 ms | not measured |
| Warm generated-data-cache startup    |               — |          200 ms | not measured |
| First-use acquisition                |               — |       30,000 ms | not measured |
| End-to-end host provider             |               — |       60,000 ms | not measured |

The total is the learned dependency closure plus the verified model cache plus
the configured 32 MiB generated-data-cache quota. Passing the npm and model
transfer ceilings therefore does not make this candidate footprint-ready. The
current native stack exceeds the total ceiling by 134,927,980 bytes, and the
generator is 82,462,493 bytes above its optimization target. The next footprint
work is the calibrated compression frontier and supported platform-specific
runtime packaging, followed by the still-unmeasured integrated timings and
release-platform reruns. The existing WASM no-go remains unchanged.

## WASM decision

The installed ONNX backend allocation in this development checkout was about 220,454,912 bytes for `onnxruntime-node` and 134,881,280 bytes for `onnxruntime-web`. Holding the 192,167,332 model/tokenizer/classifier bytes constant gives a product-total reduction from 412,622,244 to 327,048,612 bytes (20.74%). The backend-only reduction clears the preliminary 25% screen, so identical classifier artifacts were benchmarked before attempting the much longer autoregressive campaign.

| Backend  |      Load |     p50 |     p95 |   Process max RSS |
| -------- | --------: | ------: | ------: | ----------------: |
| Native   |  50.18 ms | 0.64 ms | 1.85 ms | 174,211,072 bytes |
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

The production exporter generated a new blinded packet from commit
`5fce6f7c1ac8eb4a26d2d233f2b5985c03f983cf`. It exercised the retained
classifier and INT8 SFT artifacts through the production package and exposed two
compatibility defects that are now covered by regressions: declared EDMX
complex/collection properties no longer abort scalar generation, and semantic
numeric candidates that exceed declared precision/scale now fall back to a
schema-valid deterministic value.

| Evidence property         | Result                                                                       |
| ------------------------- | ---------------------------------------------------------------------------- |
| Reviewed fields prepared  | 307                                                                          |
| Domains                   | finance 60; sales 77; service 32; maintenance 18; master-data 60; non-SAP 60 |
| Input formats             | EDMX V2 120; EDMX V4 77; CSN 110                                             |
| Coverage gaps             | 0                                                                            |
| Candidate fingerprint     | `d6d568591d57d6571f4e1707efb99b6980326b6d6c410298e640ecfedd5313a1`           |
| Evidence fingerprint      | `2b180f281a0a28e9dfcf07a3c5cd2e96767c8bb2863fcbff6c53da87836c9cf6`           |
| Evidence file SHA-256     | `3eabd573d20df366f157ed726d0bff43c60ac3feea14561f3eda1292af846ae6`           |
| Campaign manifest SHA-256 | `967b37bfe024596cb9cc052defb710aa8f5a813f89bcc06da81a0d1f3225d302`           |
| Runtime                   | Node 22.22.2, ONNX Runtime 1.24.3, darwin-arm64                              |

The packet passes its structural coverage gate but has not yet been reviewed by
the two independent providers. Until that consensus passes, structural and
model-runtime readiness must not be described as proven realism. Generated
values, candidate bindings, and eventual provider artifacts remain outside the
repository; only aggregate results and checksums are recorded here.

## Reproduce

See [the evaluation harness](../../scripts/mockserver-data-generator-evaluation/README.md). Reports contain hashes and aggregate metrics but no generated values or absolute pilot paths. Exact candidate outputs for judging are emitted only to an explicitly supplied external evidence directory.
