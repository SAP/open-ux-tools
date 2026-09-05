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
| SFT production config      |         252 | `e85eaf5fc93ac454809ee7b04956e484a44f034ef28cb03c11328844a8f97e39` |
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
| Realism prompt, schema, and selection | `training/review/generation-inspection-prompt.md` SHA-256 `6ecf69aad17021343ca225b21003c9e0a858daae424c25d2a8b31445b5d2b20a`; `training/review/generation-inspection-output.schema.json` SHA-256 `c6192e28bdbe1aec04a9c7e67da69f751dc0ba132fb2d23d04a53f998b2b6e0d`; `benchmark/ml-native/llm-inspection-manifest.json` SHA-256 `202ca3ef76cd1b741bcc4792b22880231f0de3edcbbd58b82bb596fa5288f12f` | Reuse the frozen review contract and selection tooling. Replace the pilot services because the original cohort was used during development and did not provide 50 fields in every domain. The replacement cohort is source-family/service-disjoint from classifier training, SFT training/evaluation, and pilot model selection. |
| Independent OpenAI and Anthropic pilot realism judgment | The tracked aggregate status records evidence fingerprint `518c7efd66dfc24cb63bd3259f4c2596ff901a2a38a6b19b290618575f408e33` and report fingerprint `4baca51dcceee8a95f4693a5fb26f0aac3bb0f62e509aa74f8bdb26f0efb9f3a`; the full provider artifacts are not tracked | Preserve as a failed historical baseline: 16/60 realistic consensus, 37 major defects, no critical defects, and 10 disagreements. It must not be rerun merely to reproduce the old result, but the aggregate cannot be recompiled as current evidence. |
| Later pilot multidomain generation replay | 343 fields; evidence fingerprint `00832a6ec51d3c676c486cbf21ca813a25ed7e79dc52906f0d4c2d5c75bd3032`; file SHA-256 `fce4e56600e5edbbbe16f596d9064907fc52b62962bde35ab6bdfd99fc2e42d0` for both original and repeat | Preserve as deterministic historical evidence. It is not a realism verdict and is not bound to the production candidate. |

Only one external realism-evaluation activity remains: two independent providers
must review the exact 311-record production packet described below. Its candidate
and evidence fingerprints differ from the retained pilot packets audited above,
so reusing an old verdict would break evidence lineage. This is a new judgment
over the frozen replacement inspection cohort and the new production adapter, not classifier or SFT data collection,
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
| Generation p50 / p95    |                                                     2.06 / 18.73 s |
| Session load            |                                                             0.88 s |
| Output fingerprint      | `9b97cd178c9336617e6554bace5ea9fcf0e71d4301042b85180f6896c846c92c` |
| Judge-evidence SHA-256  | `ba6e0d2566e937f1b4fc19a1fa061be13d0e5fbc33ed6b5363173cd784c53bb1` |

These final values come from the clean, evidence-bound `568aaf8b0` candidate
using the production 300-token configuration, not the earlier evaluator-only
400-token allowance. The decoder now caches grammar-equivalent allowed-token
sets per request and selects the exact top-p nucleus without sorting the full
vocabulary. Regression tests prove equivalence to the previous full-sort
algorithm, and the output fingerprint did not change.

An independent identical-seed replay produced the same output fingerprint and
evidence SHA-256. Its p50/p95 was 2.05/18.55 seconds. This clears the fixed
development gates of at least 99% parse, at least 95% fill, deterministic
replay, and a 20-second SFT budget on `darwin-arm64` with Node 22.22.2. Peak
process RSS varied from 1,550,630,912 to 1,827,061,760 bytes across the two
isolated runs, so memory remains a visible measurement rather than an implied
pass. The larger final cross-platform and integrated structural campaign
remains required before promotion.

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

The reviewed npm package contains no weights and packs to 67,487 bytes in the current development canary, far below the 5 MiB ceiling. Model and runtime footprints are reported separately:

| Candidate                                  | Model bytes | Development result                                                                                                         | Decision                          |
| ------------------------------------------ | ----------: | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Dynamic INT8                               | 164,924,986 | 100% parse, 99.23% fill after adapter corrections                                                                          | Retain as current candidate       |
| Optimized dynamic per-channel INT8         | 165,323,027 | Exact runtime contract, but 398,041 bytes larger than the retained INT8 graph                                               | Reject before full quality run    |
| MatMul-only weight-only INT4               | 200,835,311 | Larger than INT8; prior fixed pilot gate recorded 33.33% symmetric or 66.67% asymmetric parse and substantially lower fill | Reject                            |
| Full MatMul and Gather RTN INT4            | 105,726,471 | Exact runtime contract and 35.9% smaller than INT8, but uncalibrated and 23,263,978 bytes above target                      | Ineligible size screen            |
| GPTQ MatMul plus RTN Gather INT4            | 105,218,355 | 68.75% parse, 32.57% fill; partial calibration and 22,755,862 bytes above target                                            | Reject                            |
| All-cohort vocabulary-pruned INT8           | 120,758,455 | 16/16 parse and 257/261 fill, but token selection observed the held-out cohort                                               | Ineligible feasibility upper bound |
| All-cohort vocabulary-pruned GPTQ/RTN INT4  |  76,924,162 | Meets the byte target, but only 11/16 parse and 83/261 fill; selection leaked and `Gather` remained uncalibrated             | Reject                            |
| Training-closure vocabulary-pruned INT8     | 119,905,975 | Training-only selection; 15/16 parse and 238/261 fill                                                                        | Reject                            |
| Training plus rank-fill 18,000 INT8         | 129,037,882 | Training-only closure plus pretrained merge rank; 12/16 parse and 128/261 fill                                               | Reject                            |
| Training-closure bounded-recovery INT8      | 119,905,975 | One training-derived recovery epoch; 11/16 parse and 103/261 fill                                                            | Reject                            |
| Pretrained-rank 10,000 bounded-recovery INT8 | 119,821,879 | Reduced-token training without held-out selection; 7/16 parse and 36/261 fill                                                | Reject                            |
| Pretrained-rank 10,000 fresh SFT FP32       | 472,139,701 | Fresh three-epoch SFT from the original base; 11/16 parse and 116/261 fill                                                    | Reject source model               |
| Pretrained-rank 10,000 fresh SFT INT8       | 119,821,880 | Dynamic INT8 export of the fresh SFT; 12/16 parse and 118/261 fill                                                            | Reject                            |
| Fresh SFT INT8, 600-token diagnostic        | 119,821,880 | Model-specific completion budget; 13/16 parse and 166/261 fill                                                               | Reject; stop budget tuning        |
| Uniform depth-6 screen INT8                 |  78,305,643 | Full tokenizer and task-specific weights; 0/16 parse and 0/261 fill                                                          | Reject direct pruning             |
| Uniform depth-7 size screen INT8            |  81,913,038 | Exact 17-input/15-output contract; clears the target by 549,455 bytes; quality not yet evaluated                             | Maximum-depth distillation base   |
| Uniform depth-6 recovered FP32              | 311,719,705 | Three-epoch full-parameter recovery; 4/16 parse and 15/261 fill                                                              | Reject source model               |
| Uniform depth-6 recovered INT8              |  78,305,644 | Clears the byte target by 4,156,849 bytes; 5/16 parse and 30/261 fill                                                        | Reject                            |
| Uniform depth-7 distilled FP32              | 325,919,941 | Top-k teacher-logit and structural-token distillation; 2/16 parse and 11/261 fill                                            | Reject source model               |
| Uniform depth-7 distilled INT8              |  81,913,038 | Clears the byte target by 549,455 bytes; 4/16 parse and 28/261 fill                                                          | Reject                            |
| FP32                                       | 652,552,120 | Exact runtime contract, but 3.96 times INT8 bytes                                                                          | Reference only; do not distribute |

The historical INT4 graph is 21.77% larger than INT8 because its MatMul-only
quantizer did not cover the 113.25 MB embedding matrix. A newer supported ONNX
Runtime path can quantize the embedding `Gather`, but full RTN remains
uncalibrated and therefore ineligible. A bounded GPTQ probe calibrated all 211
constant-weight `MatMul` nodes with three production-rendered prompts spanning
bookshop, finance, and northwind; ONNX Runtime supports only RTN for the one
constant-weight `Gather`, so the resulting candidate is explicitly only
partially calibrated.

The clean `b00b1e0d8ad9dc92f17c50daf2229509b40f2866` production-evaluator
run rejected that candidate independently of its calibration status. Only 11
of 16 frozen cases parsed with exact keys, and only 85 of 261 eligible requested
fields were filled. Its p50/p95 T2 latency was 1.60/10.29 seconds and load time
was 651.04 ms, but latency cannot compensate for missing the 99% parse and 95%
fill gates. Report fingerprint
`69f53c0aaa964e66a33f478bc281dbd499d0b23e063498ce931894a5201fc734`
has file SHA-256
`2e1c14e1b511c46c0b9fee683f419e47597673021995109753470a94b42c1388`;
the candidate model SHA-256 is
`f140fb0f9cd9375617c32528f605197c8af72777f4501462412476c3415f99ed`.
The report contains no local paths or generated values.

Quantization alone therefore has no passing path to the 82,462,493-byte target
on this export. Quantization-aware training could recover quality but cannot
remove the remaining 22.76 MB by itself. The next justified branch is a smaller
vocabulary/domain tokenizer or a smaller distilled architecture, with any
low-bit training performed on that reduced model. Every new candidate must
rerun the same structural and realism gates.

The vocabulary campaign confirmed that the embedding/output matrices provide
enough removable capacity, but an existing checkpoint cannot be safely
retrofitted. A deliberately ineligible 10,813-token upper bound selected from
training, held-out evaluation, and production prompts. Its inherited INT8 graph
nearly retained the baseline contract at 16/16 parsed cases and 257/261 filled
fields. Applying GPTQ to `MatMul` and RTN to the only supported `Gather` path
reached 76,924,162 bytes—5,538,331 bytes below target—but collapsed to 11/16
parsed cases and 83/261 filled fields. Held-out selection and partial
calibration independently disqualify that result.

A valid training-only closure retained 10,073 of 49,152 tokens. It exactly
remapped all 2,877 training records and 4,000,764 production-tokenizer ids, but
its inherited INT8 graph reached only 15/16 parsed cases and 238/261 filled
fields. Filling that closure to 18,000 tokens by pretrained merge rank made the
result worse. A bounded one-epoch LoRA plus tied-embedding recovery also made
the 10,073-token result worse, while a 10,000-token pretrained-rank tokenizer
trained on the changed decomposition reached only 7/16 parsed cases and 36/261
filled fields. Structural failures stop realism judging for all four.

The reusable training-only builder is now part of the evaluation harness. Its
independent replay produced the same vocabulary and merge list as the research
prototype, a 660,439-byte tokenizer, and a projected 76,378,053-byte low-bit
graph with 6,084,440 bytes of target headroom. The portable evidence fingerprint
is `c1a3b1e111244662641eacac7e0b6a1b538102d13dcddcb10a47b74915897353`;
the evidence file SHA-256 is
`d90d5dd9107d6155cafefb725a61eaad3b1b36c1b405dfbd806da61e5f14371f`.
A fresh reduced-token SFT has now closed that branch. The 10,000-token
pretrained-rank selection used no training, evaluation, or held-out token ids;
all 2,877 training records decoded exactly after remapping. Training started
from the original base model, not the pilot checkpoint, and completed all three
epochs. Evaluation loss moved from 1.105903 before training to 0.672898,
0.575135, and 0.555240 after each epoch. The merged FP32 model nevertheless
reached only 11/16 parsed cases and 116/261 filled fields. Its dynamic INT8
export reached 12/16 and 118/261. Raising only the completion budget from 300
to 400 tokens changed no result; a bounded 600-token diagnostic recovered one
case but still reached only 13/16 and 166/261. The remaining failures ended
before completing their JSON objects, so further token-budget tuning is not
justified.

The training report SHA-256 is
`8a5e1779017b8fb5e4fe8326718d30e9ce689490611969d49ff006d8e3e9ec9a`.
The FP32 and default-INT8 evaluation files have SHA-256
`652384d8dbb50f2b3724cea0a9f51a6703dc0b062d208f6957e3bed862442718`
and `715ec0157957a1fd5539c1d212d3ed738075c72ae353d29155b5eded9b49034a`.
The clean 600-token replay binds commit
`0c7532c0941d382478f9508fa292d5a499af0b8d`; its report fingerprint is
`362191ba9ed9852cd043b718bdd37e11e67db42a5c744b0a183036ab4b50d2d4`
and its file SHA-256 is
`d49c5421492e540ca7e981d8b001ae8cf666c4d6b920f7f36119e8815bf895e7`.
The consolidated rejected-campaign fingerprint is
`6f3eb6b18ec56304c0cabf9fc18c09e8a4c9f10490b8f31d2ce6a5a7c2af8913`;
the campaign file SHA-256 is
`e2717f69628102c80ee86a06b3737971475105f319342647ab83bfba4a719058`.
Because the FP32 source model fails before quantization, QAT and a calibrated
low-bit export are not justified for this candidate, and realism judging is
correctly skipped.

Candidate 6 first tested whether a smaller architecture can retain the proven
full tokenizer and task-specific embeddings. An initial conservative six-layer
student retained teacher layers 0, 6, 12, 17, 23, and 29. All 57 mapped state
tensors were bit-exact. Its 78,305,643-byte INT8 export reduced generator bytes
by 52.52% and cleared the target by 4,156,850 bytes, but direct pruning completed
none of the 16 frozen JSON cases. Exact boundary measurement then showed that a
seven-layer student also fits: its 81,913,038-byte INT8 graph has the exact
17-input/15-output runtime contract and 549,455 bytes of target headroom. Seven
layers is therefore the maximum-capacity same-width/full-tokenizer base for the
next distillation experiment. Its size-evidence fingerprint is
`ce04ce2ffc7f664b41c7a8d7feba32b29769a3eab4c8cb74b020ef3c842b4dd0`;
the evidence file SHA-256 is
`9cf896b3e2218ac4209080121fbbb4c6d486eed4fff1f0bcd03fed8c1b348ac7`.

A bounded full-parameter recovery then used the original governed SFT sample:
1,149 training examples and 194 held-back training-evaluation examples, with no
frozen production cohort used during training. All three epochs and 216
optimizer updates completed in 28.1 minutes. Evaluation loss improved from
15.983883 to 3.938276, 3.118114, and 2.926326. The recovered FP32 model still
reached only 4/16 parsed cases and 15/261 filled fields; dynamic INT8 reached
5/16 and 30/261. This rejects uniform depth pruning plus ordinary recovery SFT,
not the byte feasibility of a smaller model. The next bounded Candidate 6 path
must add teacher-guided structural-token distillation rather than repeat SFT.

The preparation and recovery-training report SHA-256 values are
`52ad7a8b077b5515b8271bd4d2ab5f1b93fedc3f383f7dd329dbe09b787efd7b`
and `31cc29bf38b681fda0935e9fa1517db492e53d34ff7903081a7396836041a694`.
The clean combined evaluation binds commit
`d709e6d4ad98108edcf33db74c4d5917eed65963`; its report fingerprint is
`a694bcea288bffa1ad254133f17a7b8c12d6887bc75d85ec2f7d9fd18fefb4e4`
and file SHA-256 is
`857d865f940ca01a8821c1ffe6cdac4d6edca8ed44feded21c2383c4b35333bf`.
The rejected campaign fingerprint is
`e7509b2f15c0078706611cf5a20b2d406a421d9523bf2fbf6c662e62bb387380`;
the campaign file SHA-256 is
`7b0869231a632ee4e916cd598e87462482110e534500fcc32b695a4decf3575c`.

The final Candidate 6 experiment used that seven-layer boundary and the
retained 30-layer task-specific model as its teacher. A resumable top-32 logits
cache covered all 1,149 training records and 492,934 completion tokens without
storing raw text. Full-parameter training used temperature 2, hard/distillation
weights 0.6/0.4, and a three-times weight for structural JSON tokens. The frozen
production cohort remained excluded. All three epochs completed, improving the
held-back loss from 11.581748 to 3.975526, 3.104364, and 2.903704.

The improvement did not recover the production contract. The 325,919,941-byte
FP32 candidate reached only 2/16 parsed exact-key cases and 11/261 filled
fields. Its 81,913,038-byte dynamic-INT8 export cleared the target by 549,455
bytes but reached only 4/16 cases and 28/261 fields; every failed case ended
before completing its JSON object. FP32 failure proves that quantization is not
the cause. Structural failure stops realism judging.

The clean evaluation binds commit
`fdc8dc8054f4fef5495d8a31188b06e1a4898b45`; its report fingerprint is
`7bb267f0af047068c383f880322735563915d4c4d1fa0df6ede41fcd31a8c148`
and file SHA-256 is
`0d4e25d67f93e8d9563c9be1802fa3457b26aa1e51cc22def9b0266744241871`.
The consolidated campaign fingerprint is
`c66f98d8058c307046da5daa724f9991d7fa21e47af721806f017b4a276f54b7`;
the campaign file SHA-256 is
`35b2088d357e218170791fc037ea9f73db2ab1c2a8dac60d95de3c25b39a4288`.

Candidate 6 is therefore complete and rejected for promotion. No tested
size-passing learned generator satisfies the frozen structural gates. The
164,924,986-byte pilot INT8 model remains the quality baseline. The total
footprint is instead technically feasible with the platform-specific native
runtime proof below; repeating the same pruning, token-budget, ordinary-SFT, or
structural-distillation recipes is not justified.

## Machine-readable multi-platform runtime baseline

The production footprint harness measured clean commit
`568aaf8b03a4bdf510d3203997171c308ab40ecd` on `darwin-arm64` with Node
22.22.2, npm 10.9.7, an Apple M3 Pro, and `onnxruntime-node@1.24.3`. The
package archive SHA-256 is
`a71d2534476e739d0da991362a5b9d2c7940a6518308915ba813b37539201e71`.
The complete compiled `dist` tree fingerprint is
`2a75575b6845dfe244e6c42aca14b2961c19f490b919315605cda6df5fdc7e61`,
so an unchanged entry point cannot hide stale transitive build output.
The report fingerprint is
`19b8e4cbc409d2dba812e2d335aa949748c907f7bf7c60f878ba0751f5f2c716`
and its file SHA-256 is
`afb7167ae458feab431cc356329a1e979e8f5e1892352fd2e689920b5790e958`.

The report is also bound to the exact model-evaluation artifact with fingerprint
`d6aadb7a0d05934f2b35970abdf9c594768546603a44b4a1a7083aeb47945bfe`
and file SHA-256
`e96695913ef0d4296ebe2151b4f567fa035bcfa3fe49d934019227b122d1d9b8`.
It additionally binds the 300-token generation configuration fingerprint
`fe6f3cc1aee19a16ed3205c7e5fca4926c4386243175f14453051ec248e91016`
and rejects subset, duplicate-INT8, changed-seed, changed-locale, or changed
cohort reports.
That rerun preserved the classifier metrics and the SFT output fingerprint. It
parsed all 16 held-out cases, emitted exact keys for all 16, and filled 259 of
261 requested fields. A second full clean run had report fingerprint
`a35f4604e138d38ddcae4c947894a91381c3b4c22914b13b1d1cc2701ed21ce1`
and file SHA-256
`557462c7c895035e97fbb16429090d697af2882e3426593ffcf59430c48426bc`;
it reproduced both classifier and SFT output fingerprints.

| Measurement                         |          Actual |       Threshold | Status       |
| ----------------------------------- | --------------: | --------------: | ------------ |
| npm archive                         |          58,273 |       5,242,880 | pass         |
| npm unpacked                        |         235,298 |               — | measured     |
| Deterministic dependency closure    |       2,119,534 |               — | measured     |
| Learned dependency closure          |     223,781,652 |               — | measured     |
| Native runtime increment            |     221,662,118 |               — | measured     |
| Model transfer                      |     192,167,584 |     209,715,200 | pass         |
| Verified model cache                |     192,167,584 |     209,715,200 | pass         |
| Generated-data-cache quota          |      33,554,432 |      33,554,432 | pass         |
| Total installed and cache footprint |     449,503,668 |     314,572,800 | **fail**     |
| INT8 generator weights              |     164,924,986 |      82,462,493 | **fail**     |
| Provider module-load p95             |         1.78 ms |          250 ms | pass         |
| Model session-load p95               |       877.85 ms |        5,000 ms | pass         |
| T2 generation p95                    |    18,725.48 ms |       20,000 ms | pass         |
| Peak process RSS                     |   1,550,630,912 |               — | measured     |
| Cold whole-service generation        |               — |       25,000 ms | not measured |
| Warm generated-data-cache startup    |               — |          200 ms | not measured |
| First-use acquisition                |               — |       30,000 ms | not measured |
| End-to-end host provider             |               — |       60,000 ms | not measured |

The total is the learned dependency closure plus the verified model cache plus
the configured 32 MiB generated-data-cache quota. The unmodified upstream
multi-platform dependency closure exceeds the total ceiling by 134,930,868
bytes, and the generator is 82,462,493 bytes above its non-blocking optimization
target. The platform-specific proof below addresses the total-size failure
without weakening model quality. The still-unmeasured integrated timings and
release-platform reruns remain required. The existing WASM no-go is unchanged.

## Platform-specific native runtime feasibility proof

A clean `darwin-arm64` proof retained only the native subtree selected by the
`onnxruntime-node@1.24.3` loader and repacked the unchanged JavaScript runtime as
an experimental same-name archive. The evaluation harness installed that exact
archive with lifecycle scripts disabled and ran every isolated classifier and
SFT worker through its entrypoint. The footprint harness independently
reinstalled it, verified the installed package name and version, and required
the evaluation report to contain the same archive SHA-256.

| Evidence | Result |
| --- | ---: |
| Clean Open UX Tools commit | `0eb470fa97035547589a2b2bae4a86668042d6c2` |
| Runtime archive bytes | 10,195,380 |
| Runtime archive SHA-256 | `a9ebf9496d8c5cbefae9e4204779e9744e42ffb74e8bc342464abcea347de24f` |
| Unpacked runtime bytes | 36,223,887 |
| Learned installed closure | 38,913,734 |
| Verified model cache | 192,167,584 |
| Generated-data-cache quota | 33,554,432 |
| Total installed and cache footprint | **264,635,750 / 314,572,800, pass** |
| Remaining total-footprint headroom | 49,937,050 |
| Provider module-load p95 | 1.284 ms, pass |
| Model session-load p95 | 712.35 ms, pass |
| SFT T2 p50 / p95 | 1,256.10 / 11,654.72 ms, pass |
| Peak process RSS | 1,514,766,336 bytes, measured |

The archive-bound full evaluation again ran 233 governed classifier cases and
all 16 SFT cases. The SFT result remained 16/16 parsed with exact keys and
259/261 requested fields filled, and its output fingerprint remained
`9b97cd178c9336617e6554bace5ea9fcf0e71d4301042b85180f6896c846c92c`.
The evaluation report fingerprint is
`62fc34b38e689937791677fd1ba589df06f47bb37e18b87a915ea84d6a3d4c5e`
and its file SHA-256 is
`2991c5baca1c995413f3e66313c6b866693227fed9a26813b98e648263c71f35`.
The footprint report fingerprint is
`24692142e347e18cd3812e92016554139dfec9ade1d23027b60125cc22b17f24`
and its file SHA-256 is
`a4735b4fe18364c1642c1626519249184648d801def58429fa31571888a59720`.

### Current integrated Fiori proof

The production-shaped rerun binds clean Open UX Tools commit
`d9d813261b5a8a79761657a9505014c67fc50648` and Open UX OData host commit
`64e37ac4a6d24607c28a06242075b95afbbc1ff2`. The exact development kit has
fingerprint
`374c1611f8eb76ded0647ecfceb84e10edb29902bee178465955f5626e939afc`,
archive SHA-256
`7729156a88d41e7fd35729deea456fd43f57c6c705d930b7599001729396feab`,
and contains the 59,993-byte generator package with SHA-256
`3b5af462486b55bc3c412985f0e28064c783328cac5fc4c5c52f59d0d155a9f2`.

The kit installed the real retained classifier and INT8 SFT model into a fresh
generated-style OData V4 application. The standard `sap-fe-mockserver` path
served `$metadata` and `Products?$top=1`, reported both learned components
ready, and preserved one middleware and the existing start flow. Five fresh
processes were then measured for each integrated protocol.

| Integrated measurement | p50 | p95 | Threshold | Status |
| --- | ---: | ---: | ---: | --- |
| Cold whole-service generation | 3,318.336 ms | 3,437.153 ms | 25,000 ms | pass |
| Warm generated-data-cache startup | 21.768 ms | 25.306 ms | 200 ms | pass |
| First-use acquisition of 192,167,584 bytes | 608.980 ms | 1,308.731 ms | 30,000 ms | pass |
| End-to-end host provider | 3,319.233 ms | 3,438.173 ms | 60,000 ms | pass |

Every warm-cache sample came from a fresh Fiori process and proved that no
learned model session initialized. First-use acquisition used an empty cache, a
loopback mirror over the exact verified artifacts, and the production
30-second acquisition timeout. The report contains no application rows or local
paths. Its fingerprint is
`5ef61a30e33553acdaaee704f0108490e751d6638c22fa3699d5278157a93fbb`
and its file SHA-256 is
`f15b95f15fecee5774bb3da8020b34be10c764f477d5d6024ea8bc1680299f0e`.

The matching full model evaluation again ran all 233 governed classifier cases
and all 16 SFT cases. Routed classifier precision was 83.82% at 29.18%
coverage; SFT remained 16/16 parsed with exact keys and filled 259/261 fields.
Its fingerprint is
`938af622b87f4de16fb92805f40b8c7cbafc520da5973c18fd3ff57e667a7eeb`
and its file SHA-256 is
`bf7a6c65aa00e3d801c3d049afa5acd2e6869c22a69681d2aec400e48a1e21cd`.

The final footprint report cryptographically imports both reports and the same
runtime archive. It measures 264,636,488 total installed-and-cache bytes,
49,936,312 bytes below the 300 MiB ceiling. All hard gates pass; only the
non-blocking 82,462,493-byte generator optimization target remains missed. Peak
process RSS was 1,187,676,160 bytes. The footprint report fingerprint is
`ea4a469cd80dfa874d13e784a4c9c6a762ddf39ec99980688fb07b3399697578`
and its file SHA-256 is
`1b329b6bfc675f67bc25bb6b24ba0a3b8fa10624c5c6e311619fd80974737514`.

The three portable reports are retained together outside the repository at
`mockserver-data-generator-runtime-proof-darwin-arm64-d9d813261`. This closes
the previously unmeasured local integrated timing gates; supported runtime
distribution and release-platform reruns remain separate work.

### Cache-fix evaluation and integrated proof

The proxy-aware candidate was rerun after the integrated warm-cache protocol
exposed an invalid cache-statistics invariant: raw SFT row/chunk completion
attempts were required to equal entity assignments. Commit
`40393c7c6f98d13ad79301b83be7ab24a84a7e46` corrects that invariant while
retaining the attempt, parsed-response, eligible-slot, accepted-slot, and
assignment bounds. A focused regression failed before the correction and the
full package then passed 23 suites and 198 tests.

The exact 82,508-byte package archive has SHA-256
`f40c4a1eb86b95fb6776ed929934a40f978c7691f641b31b8be7ad824a6cacd5`.
Its compiled generator fingerprint is
`c4c8d488b1adf9f8d0fcad6ec57d1261f20a922f82ef498362c4e89016d3514a`.
The evaluation and replay used the same platform runtime archive identified
above and ran the complete retained INT8 cohorts.

| Cache-fix evaluation | Result |
| --- | ---: |
| Governed classifier cases | 233 |
| Routed precision / coverage | 83.82% / 29.18% |
| Classifier latency p95 | 1.004 ms |
| SFT parse / exact-key cases | 16/16 / 16/16 |
| SFT requested fields filled | 261/261 |
| SFT p50 / p95 | 1,237.172 / 7,559.574 ms |
| Peak process RSS | 1,448,493,056 bytes |
| Classifier prediction fingerprint | `996ecd51682b602623671a1607b2c7c152d6efc8a663fdeec29a1f12da4293b7` |
| SFT output fingerprint | `a387914bf81db43f653aaf217fa5c275b10891ebf70d41414ab4a89c590acaf3` |
| SFT evidence SHA-256 | `89a942e186b0f9510aa026ee6f1293a5f98de5a2450ae0e8c428c31a36d8b17b` |

The independent identical-seed replay produced the same classifier prediction,
SFT output, and evidence hashes. The evaluation report fingerprint is
`2237987b581ad0a0689ff331985b9d4bf1f7c33a8ba886fe24d43102aeb0de81`
with file SHA-256
`4887feca24f957e9ff6d81fd74e147c02ea66ce6de25cd5ca83a11276fe87084`.
The replay file SHA-256 is
`102bf5a730f3bdb055dc725707091e55da82854b4e492d6067af9e5bcb737959`.

The exact package and compatible host were installed into a generated-style V4
application with both learned components verified. Five fresh processes were
measured for every integrated protocol:

| Cache-fix integrated measurement | p50 | p95 | Threshold | Status |
| --- | ---: | ---: | ---: | --- |
| Cold whole-service generation | 1,986.364 ms | 2,595.700 ms | 25,000 ms | pass |
| Warm generated-data-cache startup | 18.823 ms | 19.072 ms | 200 ms | pass |
| First-use acquisition of 192,167,584 bytes | 523.127 ms | 1,221.860 ms | 30,000 ms | pass |
| End-to-end host provider | 1,987.151 ms | 2,596.510 ms | 60,000 ms | pass |

Every warm sample reused the corrected cache without initializing a model
session. The integration report fingerprint is
`2463e1a0c832491831de6915699191113cb10b40cbf512f41ac215c00d2d8f31`
with file SHA-256
`d66788290b94d61ff3d6378adb0829991942e1c6c2c10404f47f8bb4d0e5d1e7`.

The enforced footprint report imports the exact evaluation, integration,
runtime, model, and package identities. It records 266,364,774 total
installed-and-cache bytes, leaving 48,208,026 bytes below the 300 MiB ceiling.
Every required gate passes and `footprintReady` is true; only the explicitly
non-blocking generator-halving target remains missed. The footprint report
fingerprint is
`a6b9a61aba123ed9ae4fcb04cdbe28c57c528e70d5f41e2616112b6ca159c122`
with file SHA-256
`34f40d076ea4d69a56bad001bbed7ef9c38e159c76bc5f55076e6eecce1db00b`.
The reports and generated-value evidence are retained outside the repository at
`mockserver-data-generator-runtime-proof-darwin-arm64-cachefix-40393c7c6`.
This remains local macOS arm64 evidence, not an approved runtime distribution or
a substitute for BAS, cross-platform, governance, or independent realism gates.

### Production-TypeScript hardening checkpoint

Commit `d26eaa535637c29552b6f1364f751035ee15750b` removes every production
TypeScript non-null assertion from the model-runtime implementation and makes
the package lint fail if one is reintroduced. The host source remained fixed at
`2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`. Two clean dev-kit builds were
byte-identical with fingerprint
`07bca9812e87056fb1e7af1af38f9395ad4452dba43ee44a30578fad3baa2cde`
and SHA-256
`9137cbcb98a490ef7830ad17ab3675e8e90f6381200de9e970e35e81f4b4c285`.

The exact 82,926-byte generator package has SHA-256
`16ca9cc103b85e16be983d903d26fefd379c380968bdb4884469b6f4a5e017ea`
and compiled build fingerprint
`997ba740c440760fac487f182aa9ff11227a430fd7b6ff1d775f93400d9d4b86`.
The complete evaluation and independent replay retained identical classifier
predictions, SFT output, and judge-evidence hashes.

| Hardened evaluation | Result |
| --- | ---: |
| Governed classifier cases | 233 |
| Routed precision / coverage | 83.82% / 29.18% |
| Classifier latency p95 | 0.911 ms |
| SFT parse / exact-key cases | 16/16 / 16/16 |
| SFT requested fields filled | 261/261 |
| SFT p50 / p95 | 1,287.554 / 8,190.491 ms |
| Peak process RSS | 1,447,985,152 bytes |
| Classifier prediction fingerprint | `996ecd51682b602623671a1607b2c7c152d6efc8a663fdeec29a1f12da4293b7` |
| SFT output fingerprint | `a387914bf81db43f653aaf217fa5c275b10891ebf70d41414ab4a89c590acaf3` |
| SFT evidence SHA-256 | `89a942e186b0f9510aa026ee6f1293a5f98de5a2450ae0e8c428c31a36d8b17b` |

The evaluation report fingerprint is
`e4f6b8f92e9be1124f75ec6c32b7ddb98a4638eeab7e94f1b8e7f83c2863bc01`
with file SHA-256
`0c333099cb6003a52c876bb27796d06789fecb1d552c83a052baadd46afe34e6`.
The replay file SHA-256 is
`32f805e86903843877b3628bdc1bab40cc8c7c22c26cabcb2ce00b672da8a316`.

| Hardened integrated measurement | p50 | p95 | Threshold | Status |
| --- | ---: | ---: | ---: | --- |
| Cold whole-service generation | 1,979.323 ms | 2,548.303 ms | 25,000 ms | pass |
| Warm generated-data-cache startup | 16.860 ms | 19.659 ms | 200 ms | pass |
| First-use acquisition of 192,167,584 bytes | 982.305 ms | 1,094.513 ms | 30,000 ms | pass |
| End-to-end host provider | 1,980.128 ms | 2,549.076 ms | 60,000 ms | pass |

Every warm sample avoided model initialization. The integration fingerprint is
`38cc6a08616192caedd220d38a6ee77e24b787b6e6c858f2cb80b37263d58efe`
with file SHA-256
`2504bb859965dc80fa8a5cb64991ebcdbf8639f358a1e55753b1db50119a602b`.

The enforced footprint is 266,366,901 bytes, leaving 48,205,899 bytes below
the 300 MiB ceiling. Every required gate passes; the generator-halving target
remains a separately reported non-blocking miss. The footprint fingerprint is
`bcd5df054928bc380bd1c69e12c819e4dd1bea000deab70c00226742053bff82`
with file SHA-256
`f300b12aa094c691997b0e2cf4dfc9abb98c5a15ed1e62126b17e4879a2192bc`.
The complete proof is retained outside the repository at
`mockserver-data-generator-runtime-proof-darwin-arm64-hardening-d26eaa535`.
It remains local macOS arm64 evidence and does not replace BAS, release-platform,
governance, independent realism, or publication gates.

### Production lint-safety checkpoint

Commit `4d620e0fd80814f729ac890597626596c8f93dda` promotes explicit production
return types, safe assignments, default switch paths, consistent returns, and
the non-null-assertion ban to package lint errors. The current violations were
removed while the host source remained fixed at
`2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`. Two clean dev-kit builds were
byte-identical with fingerprint
`e72683c87dc4ac91926d4dd9d9a82756e5615ff9e93b1210eb3a939734432a91`
and SHA-256
`2c573d8ced54736639aef3dabc091e9a6ddae824fdab14ed96560637f434117d`.

The exact 83,011-byte generator package has SHA-256
`ae1ace0934a64b935f78d198ac2b713fc1e236dbc549369b39f2853fc0308d4e`
and compiled build fingerprint
`170673efe05c45734287b2641c2997bee1a85e0d06d81b791fc63c7b1a74966f`.
The complete evaluation and independent replay retained identical classifier
predictions, SFT output, and byte-identical judge evidence.

| Lint-safety evaluation | Result |
| --- | ---: |
| Governed classifier cases | 233 |
| Routed precision / coverage | 83.82% / 29.18% |
| Classifier latency p95 | 0.929 ms |
| SFT parse / exact-key cases | 16/16 / 16/16 |
| SFT requested fields filled | 261/261 |
| SFT p50 / p95 | 1,261.771 / 8,196.967 ms |
| Peak process RSS | 1,435,779,072 bytes |
| Classifier prediction fingerprint | `996ecd51682b602623671a1607b2c7c152d6efc8a663fdeec29a1f12da4293b7` |
| SFT output fingerprint | `a387914bf81db43f653aaf217fa5c275b10891ebf70d41414ab4a89c590acaf3` |
| SFT evidence SHA-256 | `89a942e186b0f9510aa026ee6f1293a5f98de5a2450ae0e8c428c31a36d8b17b` |

The evaluation report fingerprint is
`6629b66d87276b5e6b40b4742989fe1416d9f7806a292a0e5e1ad8e5eb8f6d60`
with file SHA-256
`a28b3b60b8726b13319ad5b18e54d04c061a50ee7288a6139d57137be2ab468d`.
The replay file SHA-256 is
`1451c03eed8156cf0e6fe7423956edcca366bbcee49fb3385595be2491998453`.

| Lint-safety integrated measurement | p50 | p95 | Threshold | Status |
| --- | ---: | ---: | ---: | --- |
| Cold whole-service generation | 1,971.942 ms | 2,715.682 ms | 25,000 ms | pass |
| Warm generated-data-cache startup | 16.341 ms | 17.611 ms | 200 ms | pass |
| First-use acquisition of 192,167,584 bytes | 634.056 ms | 1,001.387 ms | 30,000 ms | pass |
| End-to-end host provider | 1,972.792 ms | 2,716.444 ms | 60,000 ms | pass |

Every warm sample avoided model initialization. The integration fingerprint is
`7924a6672c0935f683b21027fa8b57ae85aa43c745452ae74c0999513caa96ae`
with file SHA-256
`68e32f272dea9c6420842124ce15b7abeb53ad73c089b9fd11852f56af121442`.

The enforced footprint is 266,367,320 bytes, leaving 48,205,480 bytes below
the 300 MiB ceiling. Every required gate passes; the generator-halving target
remains a separately reported non-blocking miss. The footprint fingerprint is
`0a3369bb5163c85fd27125a7b9f2ab01ea0f20b88ae592c01384c1911d9c9cdc`
with file SHA-256
`9d988c30bffdfe6a2193548fff315a2bb8c1c7bba6e08cecdef2ec4bc45f990c`.
The complete proof is retained outside the repository at
`mockserver-data-generator-runtime-proof-darwin-arm64-lint-safety-4d620e0fd`.
It remains local macOS arm64 evidence and does not replace BAS, release-platform,
governance, independent realism, or publication gates.

### Current pilot-parity proof

Commit `f1e3db0e77c83b9be6a6bff0652923da26a263a3` adds the published pilot
parity record, makes it part of the exact packed-package boundary, and verifies
that it distinguishes preserved behavior, intentional production changes, and
deferred or excluded scope. Runtime source remained byte-identical and the host
source remained fixed at
`2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`. Two clean dev-kit builds were
byte-identical with fingerprint
`95c2b0662d3799281e72e554d3e996c49d934817dbce0140fdae0fb4030ebc35`
and SHA-256
`b7b98ea55e452c3ed1256f764eb2785b10df13af3bf0ab0dc491f35775741225`.

The exact 85,845-byte generator package has SHA-256
`1586686f5b3c6e464b962444781f864863f795a2c84c5519a4306bdd11d33ba6`
and compiled build fingerprint
`170673efe05c45734287b2641c2997bee1a85e0d06d81b791fc63c7b1a74966f`.
The complete evaluation and independent replay retained identical classifier
predictions, SFT output, and byte-identical judge evidence.

| Pilot-parity evaluation | Result |
| --- | ---: |
| Governed classifier cases | 233 |
| Routed precision / coverage | 83.82% / 29.18% |
| Classifier latency p95 | 1.388 ms |
| SFT parse / exact-key cases | 16/16 / 16/16 |
| SFT requested fields filled | 261/261 |
| SFT p50 / p95 | 1,279.895 / 8,215.569 ms |
| Peak process RSS | 1,410,744,320 bytes |
| Classifier prediction fingerprint | `996ecd51682b602623671a1607b2c7c152d6efc8a663fdeec29a1f12da4293b7` |
| SFT output fingerprint | `a387914bf81db43f653aaf217fa5c275b10891ebf70d41414ab4a89c590acaf3` |
| SFT evidence SHA-256 | `89a942e186b0f9510aa026ee6f1293a5f98de5a2450ae0e8c428c31a36d8b17b` |

The evaluation report fingerprint is
`8e43270659e7580f8b293fc0497f67b1db63ec9e587a07d7cfcc575b053c43fe`
with file SHA-256
`a307e6c8209a78e90c8183dd10b49221ed59c1275a8d67426b7a05a1ba3a34a5`.
The replay file SHA-256 is
`6646d26c26bc75bf1dcd61cd04de8d85ce0e82069704d905f9493bdaa73c8b1b`.

| Pilot-parity integrated measurement | p50 | p95 | Threshold | Status |
| --- | ---: | ---: | ---: | --- |
| Cold whole-service generation | 1,972.141 ms | 2,511.287 ms | 25,000 ms | pass |
| Warm generated-data-cache startup | 18.911 ms | 19.737 ms | 200 ms | pass |
| First-use acquisition of 192,167,584 bytes | 494.434 ms | 618.199 ms | 30,000 ms | pass |
| End-to-end host provider | 1,972.918 ms | 2,512.224 ms | 60,000 ms | pass |

Every warm sample avoided model initialization. The integration fingerprint is
`75c4edcdd344bc17031b23d229018558dd3fcec5a9d647b7cf73017b1e88c1cf`
with file SHA-256
`b07ceaa90d0ffeca5c65c8b4cfc69250f4b78e37b53d32ccb85de7327de3ca9e`.

The enforced footprint is 266,375,866 bytes, leaving 48,196,934 bytes below
the 300 MiB ceiling. Every required gate passes; the generator-halving target
remains a separately reported non-blocking miss. The footprint fingerprint is
`b29f0034b97de07ed520820c72d30ef5a9c28ca87dd558d4c825ece706050fa4`
with file SHA-256
`fd1316b32337e3fd62c97ebe9b7bbbdabefed068aa63f1f19e9cf5a2e4c95251`.
The complete proof is retained outside the repository at
`mockserver-data-generator-runtime-proof-darwin-arm64-pilot-parity-f1e3db0e7`.
It remains local macOS arm64 evidence and does not replace BAS, release-platform,
governance, independent realism, or publication gates.

This proves the size, API, inference, and quality feasibility of the retained
INT8 model with one platform's native runtime. It is not yet a production
distribution. The hand-built same-name archive has no independent release,
license/SBOM, signing, update, or platform-selection workflow. ONNX Runtime's
[current Node package manifest](https://github.com/microsoft/onnxruntime/blob/main/js/node/package.json)
still publishes the supported native platforms inside one package rather than
as platform leaf packages, while its
[Node build instructions](https://github.com/microsoft/onnxruntime/blob/main/js/node/README.md)
support building a local package for the current platform. Production therefore
needs either an upstream split or SAP-governed scoped selector/leaf packages,
followed by licensing, SBOM, signing, Node/OS matrix, installation, and rollback
qualification. Until that exists, the supported upstream closure still fails
the total-footprint gate even though the platform-specific architecture is
proven viable.

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
the deterministic package archive remains 67,487 bytes and its measured
dependency closure is 2,127,427 bytes, while learned-mode users explicitly add
the runtime and external model cache. Deleting files from a consumer's
`node_modules` in a postinstall hook is not an acceptable production
optimization. The feasibility proof above shows that a platform-specific
runtime distribution reduces the learned installation enough without changing
the model or accepting the observed WASM regression, but it must become a
supported upstream package or a separately maintained, licensed artifact with
the same compatibility and integrity tests.

## Realism status

The existing two-provider pilot report remains useful historical evidence: 60 fields across six domains were reviewed, 16 were rated realistic (26.67%), 10 provider disagreements were recorded, no critical issues were found, and the report failed its gate. It is not silently promoted or discarded.

The production exporter generated the final blinded packet from clean package
commit `817382b88f2cd88a84eb093410ad2a3a367b5505`. It used model manifest
SHA-256 `9e787993af66db136a72ed415818cabbd21cf296f4ca8a0f9cdc0e13723be961`
and revision `2bf437ed75f992b610f52076d4a0e34eb75397d7e431d6efa1cf641e20f076f5`.
The retained classifier fingerprint is
`1c3ec07345352237fe0a9c5abfea1c74455cea4105c452cb7e4dd61acbb45561`;
the retained INT8 SFT fingerprint is
`a1502adfda71285d06e0a6efdce0c7b1219395f12476b8da8778d18e06f0fa36`.

The service-disjoint cohort manifest is committed at
`tests/integration/mockserver-data-generator/test/fixtures/realism-final-cohort-v1/final-cohort-v1.json`.
It has SHA-256
`59cf8e1fe12b06bf032e1b554a0a138cda1ced1d1fc2881a67147b1dfddb086e`.
The canonical external outputs are `realism-evidence-v24.json` and
`campaign-manifest-v24.json`; `realism-evidence-v25.json` is the byte-identical
replay. The generation options are two rows per entity, seed 113, locale `en`,
learned mode, and a 90-second SFT budget. The wider budget is scoped to the
multi-entity campaign: it prevents wide services from being misclassified as
model failures while every individual completion remains bounded.
The cohort freezes 300 scalar fields: 50 in each of finance, sales, service,
maintenance, master-data, and non-SAP; EDMX V2 contributes 150, EDMX V4 100,
and CSN 50. Eleven additional blinded assertion records make the provider
packet contain 311 records.

| Evidence property             | Result                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| Scalar fields / assertions    | 300 / 11                                                           |
| Generated resources           | 16/16 non-empty                                                    |
| Structural validation         | pass                                                               |
| Frozen coherence assertions   | 11/11 pass                                                         |
| SFT parse gate                 | 178/178 responses (100%)                                           |
| SFT accepted-slot fill gate    | 821/846 fields (97.04%)                                            |
| Contributing targets           | 6/6                                                                |
| Deterministic replay           | byte-identical evidence file                                       |
| Coverage gaps                 | 0                                                                  |
| Candidate fingerprint         | `f15bd1de48b5371cd375d286014b06a67b8e2a01f3ade3c2460386897cdb9cc6` |
| Evidence fingerprint          | `3b3283cb7d134fc4a26a9b250eac17c06c28847e240691e24f0ee67de7f1c2aa` |
| Evidence file SHA-256         | `86ed29433ea71f8088c5be5fc326e9a93662939ee88edb276a9a761056382cd9` |
| Campaign fingerprint          | `2f566106eb86195beae144eeafb573571ffa273b76d52dfa8d54aa26f55d05d8` |
| Campaign manifest SHA-256     | `bba99441dc0af7f8a0fa71d128ef5a59495c48c744f2376d0874e5d6ecd4400c` |
| Runtime                       | Node 22.22.2, ONNX Runtime 1.24.3, darwin-arm64                    |

The exporter independently rejects incomplete model caches, partial learned
runtimes, empty resources, and failed frozen assertions before it writes a
packet. Independent verification re-sealed the evidence fingerprint, recomputed
both campaign fingerprints, found no absolute local path in either
evidence/campaign pair, and confirmed the repeated evidence files are
byte-identical. The replay campaign manifest differs only in the evidence
filename and the resulting campaign fingerprint, as designed. The v25 campaign
fingerprint is
`1ceed42cc861d5c140b2766e926d3a987cd7b80ff2e8d6ce8f40552a28e84532`
and its file SHA-256 is
`a40e314bc304fe4efc86e7a00dc909ed6d11ceef734bfb2437d524dcd4062871`.

This proves the local structural, relationship, coherence, runtime-binding, and
determinism gates for the macOS development candidate. It does not prove
realism: the packet has not yet been reviewed by two independent providers.
Until that consensus passes, the candidate must not be described as delivering
the required realism level. Generated values, candidate bindings, and eventual
provider artifacts remain outside the repository; only aggregate results and
checksums are recorded here.

## Reproduce

See [the evaluation harness](../../scripts/mockserver-data-generator-evaluation/README.md). Reports contain hashes and aggregate metrics but no generated values or absolute pilot paths. Exact candidate outputs for judging are emitted only to an explicitly supplied external evidence directory.
