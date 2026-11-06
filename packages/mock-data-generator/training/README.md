# Training the packaged models

These tools rebuild the models in `resources/models/` from a checkout of the public MockGen dataset
(`mockgen-datasets`, files `data/<config>/<split>.jsonl`). Training runs by hand and is not part of CI
or `pnpm build`. Every input and output is a command-line argument. Nothing is downloaded except the row
model's base model.

Build the runtime first (`pnpm --filter @sap-ux/mock-data-generator build`): the tools import the
serializer, tokenizer, encoder, role registry and head checks from `dist/`, so a trained head cannot drift
from what the package loads. Run the commands from `packages/mock-data-generator`. `D` is the dataset
checkout, `W` a work directory, `M=resources/models/classifier`, and `SHA` / `VOCAB_SHA` the encoder and vocabulary digests
in `resources/models/manifest.json`.

| Model          | Output                                                                | Dataset configs                                          | Tools             |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------- | ----------------- |
| Role head      | `classifier/head.json`                                                | `rows_head_a`, `field_contexts`, `sealed_eval`, `labels` | `role-head/`      |
| Concept head   | `classifier/concept-head.json`, `resources/banks/value-banks.v2.json` | `concepts`, `concept_examples`                           | `concept-head/`   |
| Relevance head | `classifier/relevance-head.json`                                      | `relevance_pairs`                                        | `relevance-head/` |
| Row model      | `row-model/adapter/` (then `sft/model.onnx`)                          | `sft_rendered`, `sft_examples`, `sft_teacher_rows`       | `row-model/`      |

After you replace a model, run `node scripts/build-model-manifest.mjs` and the package tests.

## Role head

```sh
node training/role-head/prepare-partitions.mjs --dataset $D --output-dir $W
node training/role-head/export-dataset.mjs --input $W/prep.jsonl --vocabulary $M/vocab.txt --output $W/export.json
node training/role-head/dump-embeddings.mjs --export $W/export.json --output $W/emb.jsonl \
  --encoder $M/encoder.onnx --vocabulary $M/vocab.txt --encoder-sha256 $SHA
for seed in 12 13 14 15 16; do
  python3 training/role-head/train_mlp_head.py --embeddings $W/emb.jsonl --train-ids $W/train-ids.json \
    --output $W/mlp-$seed.json --seed $seed
done
python3 training/role-head/ensemble_mlp_heads.py --output $W/mlp.json $W/mlp-1[2-6].json
node training/role-head/train-head.mjs --artifact $W/export.json --pretrained-head $W/mlp.json \
  --train-ids $W/train-ids.json --calibration-ids $W/calibration-ids.json --manifest resources/models/manifest.json \
  --encoder $M/encoder.onnx --vocabulary $M/vocab.txt --encoder-sha256 $SHA --output $W/head.json
node training/role-head/evaluate-sealed.mjs --dataset $D --head $W/head.json --encoder $M/encoder.onnx \
  --vocabulary $M/vocab.txt --output $W/sealed.json --origin public
node training/role-head/qualify-head.mjs --dataset $D --head $W/head.json --sealed-report $W/sealed.json \
  --manifest resources/models/manifest.json --review-record REVIEW_RECORD.json --output $M/head.json
```

- **Partitions.** Train is `rows_head_a` split `train` and calibration is split `calibration`. Both leave
  out the `public-harvest*` pool, and calibration also leaves out `bank_account_internal_id`. Texts with
  conflicting labels are dropped, and so are calibration labels that train never sees. The two partitions
  must not share a service or a family. Each context is rebuilt from `field_contexts` and must
  serialize back to the published text.
- **Head.** The MLP (`hidden 256`, `abstain-weight 3`) is trained on train embeddings only. `train-head`
  then fits temperature, thresholds, conformal quantile and per-role routing precision (0.95, at least 3
  routed) on calibration only. Roles that miss the floors stay in the head as auxiliary classes and are
  never routed.
- **Sealed evaluation.** The tool rebuilds each `sealed_eval` service as OData metadata (types, facets,
  label, description, data element, annotation terms) and routes it through the runtime classifier and
  arbitration. Every field must serialize to its published text. The domain comes from `labels`.
  `--origin` picks `all`, `public` or `synthetic` rows. The report pins the head digest and a
  fingerprint of the sealed set.
- **Qualification.** It checks the gate, the fingerprints, the review record and the runtime's release
  checks. It then strips `trainIds`, `calibrationIds`, `sealedIds` and the group and family lists, and runs
  the manifest builder's `assertPublicModelMetadata`.

## Concept head

```sh
node training/concept-head/build-concept-head.mjs --dataset $D --classifier-head $M/head.json \
  --encoder $M/encoder.onnx --vocabulary $M/vocab.txt --value-banks resources/banks/value-banks.v2.json \
  --output-head $W/concept-head.json --output-value-banks $W/value-banks.v2.json
```

The concept head has no qualification step. Review the output, then copy it to `$M/concept-head.json` and
`resources/banks/value-banks.v2.json`.

The encoder contract is copied from the role head. For each concept, the tool serializes its first 100
distinct examples. The prototype is the normalized mean of their unit embeddings, and concepts with fewer
than 5 examples are skipped. `minimumSimilarity` is the 25th percentile of the examples' similarity to
the prototype. The global thresholds are 0.75 similarity and 0.02 margin. Banks come from `bank_values`,
`bank_pairs` (`code-text`) or `bank_range` (`number`, `decimal`), and a concept with an empty bank stops
the build. The tool writes the head as format version 2 with banks split out (the `--split-head` step).
Concept banks in the store are replaced, while role banks are kept and stay first. Before writing, the
runtime parser checks the head against the new store.

## Relevance head

```sh
node training/relevance-head/train-relevance-head.mjs --dataset $D --encoder $M/encoder.onnx \
  --vocabulary $M/vocab.txt --encoder-sha256 $SHA --vocabulary-sha256 $VOCAB_SHA \
  --output-head $W/relevance-head.json --output-report $W/relevance-report.json
node training/relevance-head/qualify-relevance-head.mjs --dataset $D --head $W/relevance-head.json \
  --report $W/relevance-report.json --classifier-head $M/head.json --review-record REVIEW_RECORD.json \
  --output $M/relevance-head.json
```

The partitions are the dataset's `train`, `calibration` and `sealed` splits. They must not share a row,
service group or pair text. The model is full-batch logistic regression on the pair embeddings (2000
epochs, lr 0.2, l2 0.001). The threshold is set so that at most 1% of calibration hard negatives are
accepted, and it is never below 0.5. Sealed rows are only evaluated, once.

## Row model

```sh
python3 training/row-model/train.py --dataset $D --output-dir $W/row-model
```

The script trains LoRA on `HuggingFaceTB/SmolLM2-135M-Instruct` at revision
`12fd25f77366fa6b3b4b768ec3050bf629380bac` with r 16, alpha 32, dropout 0.05 and 7 target modules.
Training uses lr 2e-4, weight decay 0.01, effective batch 16 (4 x 4), clip 1.0, 10% warmup, at most 2048
tokens and 3 epochs, with only completion tokens in the loss. Both `sft_rendered` files must match their
pinned sha256 unless you pass `--allow-other-data`. Every line's provenance must be a published SFT
example or a teacher row of the same checkout. The script resumes from `checkpoints/latest`. It writes
`adapter/`, which `training/row-model/export.py` turns into `resources/models/sft/`.

## Python packages

`role-head/*.py` needs `torch` and `numpy`. `row-model/` needs the versions pinned in
`training/requirements.txt`:

```sh
python3 -m pip install -r training/requirements.txt
```

## Known differences from the shipped models

- **Role head calibration.** Calibration has 5,600 rows, while the shipped head used 5,586. The 14 extra
  rows (7 `account_description`, 4 `approval_status`, 2 `description`, 1 `status`) were dropped by an
  earlier filter, and the dataset does not record why. Train matches exactly (23,832 rows, same order).
- **Role head sealed set.** The private review IDs, harvest gate and held-out services are not
  published, so the held-out harvest gate is not ported, and the sealed set is the published
  `sealed_eval`. Its synthetic rows rename technical fields, so the shipped head fails the gate on
  `--origin all` (52 critical false positives) but passes on `--origin public`. On `public` it reaches
  95.7% accepted precision, 66.5% supported recall, 30/44 status fields and a 2.65% critical
  false-positive rate.
- **Review record.** The label review record is not published, so qualification takes it as an input.
- **Relevance head.** On the dataset embeddings, the shipped head reproduces exactly the calibration and
  sealed acceptance counts it recorded (5/399 positives, 6/704 hard negatives). Retraining on the same
  data with the documented settings (2000 epochs) gives different weights, and the threshold accepts no
  sealed pair at all. Qualification then refuses the head, because no passing release evidence exists.
  The fit settings behind the shipped head are not recorded.
- **Concept head.** The dataset has 1,097 concepts and the shipped head 656. For the 488 concepts in
  both, prototypes and cohesion are byte-identical. 168 shipped concepts are not in the dataset. For 55
  `name` and `text` concepts (all `reworded: true`), the dataset bank differs from the shipped one.
- **Not ported.** Rendering for the row model is not ported. The published `sft_rendered` is its
  output, and the prompt renderer it used no longer exists in the runtime. The other parts left out are teacher
  generation, LLM judges, review queues, harvesting, the gradient-descent role trainer (replaced by the
  MLP) and the learned concept acceptance layer (the shipped head has none).

## Building the ONNX models

See scripts/build-models.mjs.
