# Mockserver data generator model evaluation

This harness evaluates the production `@sap-ux/mockserver-data-generator` runtime against the fixed classifier and SFT cohorts retained by the successful MockGen pilot. It does not copy model weights, training data, or generated rows into `open-ux-tools`.

Build the package and run the native candidates from Node 22:

~~~sh
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm mockserver-data-generator:evaluate-models \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --output /tmp/mockserver-data-generator-evaluation.json \
  --evidence-dir /tmp/mockserver-data-generator-judge-evidence
~~~

The default campaign executes the pilot classifier plus the INT8 and INT4 SFT exports. Add `--sft-candidates fp32,int8,int4` when the larger FP32 graph is available and the host has sufficient memory. `--max-sft-cases` creates a deterministic smoke subset; omit it for the full fixed held-out cohort.

Evaluate a graph produced outside the repository with a path-portable candidate
manifest instead of copying or renaming it into the pilot layout:

~~~sh
pnpm mockserver-data-generator:evaluate-models \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --output /tmp/mockserver-data-generator-candidate.json \
  --skip-classifier \
  --sft-candidate-manifest /absolute/path/to/candidate.json
~~~

The manifest schema is:

~~~json
{
  "schemaVersion": 1,
  "candidate": "gptq-int4-b32",
  "artifacts": {
    "model": "model.onnx",
    "tokenizer": "tokenizer.json",
    "configuration": "config.json",
    "quantizationEvidence": "quantization-evidence.json"
  },
  "calibration": "representative",
  "promotionEligible": true
}
~~~

Artifact paths resolve relative to the manifest. Candidate IDs must be unique
lowercase kebab-case. `calibration` is one of `not-required`, `representative`,
`partial`, or `none`; a partially calibrated or uncalibrated candidate cannot
be marked promotion-eligible. The quantization-evidence artifact is mandatory,
but only its filename, byte count, and checksum enter the portable report.
Supplying manifests without `--sft-candidates` evaluates only those manifests,
so the fixed pilot candidates are never run implicitly.

## Build a reduced-vocabulary training candidate

Create a dependency-closed tokenizer and old-to-new token-id mapping without
copying private training data into this repository:

~~~sh
pnpm mockserver-data-generator:build-vocabulary-candidate \
  --tokenizer /absolute/path/to/tokenizer.json \
  --training-jsonl /absolute/path/to/train.jsonl \
  --output /tmp/mockgen-vocabulary-candidate \
  --policy training-closure \
  --fixed-model-bytes 68944179 \
  --bytes-per-vocabulary-row 738 \
  --target-model-bytes 82462493
~~~

`training-closure` retains every token emitted for the supplied training split,
plus its complete merge dependency closure. It must reproduce the original
training tokenization exactly. `pretrained-rank` requires
`--target-vocab-size`; it selects only by the pretrained merge order and may
change segmentation, but must decode every training record to the same text.
Use the latter to prepare a fresh reduced-tokenizer training experiment, never
to retrofit existing weights and claim equivalent quality.

The optional size projection is accepted only as one complete set of three
positive integers. The new output directory contains `tokenizer.json`,
`old-to-new-token-ids.json`, and `vocabulary-evidence.json`. Evidence records
only filenames, byte counts, hashes, and aggregate verification metrics—never
raw training records or absolute paths. Model weights remain external and must
be remapped, trained, exported, and evaluated through a candidate manifest in a
separate governed model workspace.

The report contains exact artifact bytes and SHA-256 hashes, governed classifier cohort counts, classifier accuracy/macro-F1/routed precision/coverage, SFT parse/exact-key/fill rates, load and generation latency, and observed process memory. Generated values are written only when an external evidence directory is supplied. A new realism judgment must use that evidence file and record its checksum; historical pilot judgments are comparison baselines, not promotion evidence.

## Package and learned-stack footprint

Create a package-only baseline from a clean checkout:

~~~sh
pnpm mockserver-data-generator:measure-footprint \
  --output /tmp/mockserver-data-generator-package-footprint.json \
  --require-clean
~~~

Bind the full footprint to a verified model cache and an INT8 evaluation report:

~~~sh
pnpm mockserver-data-generator:measure-footprint \
  --output /tmp/mockserver-data-generator-footprint.json \
  --require-clean \
  --model-manifest /absolute/path/to/model-manifest.json \
  --model-cache /absolute/path/to/verified-model-cache \
  --evaluation-report /tmp/mockserver-data-generator-evaluation.json
~~~

Use a new output filename for every run; the harness refuses to overwrite evidence. It packs the current package, installs it in an isolated npm consumer, verifies the model cache, and reports package, dependency, runtime, model, generated-data-cache, latency, and memory measurements separately. It binds imported evaluation latency to the complete compiled generator tree, exact generation config, full frozen cohorts and seed, model artifacts, runtime, machine, and clean commit; smoke subsets cannot satisfy the footprint gate. Missing integrated measurements remain `not-measured` and keep `footprintReady` false. Reports contain fingerprints and aggregate values but no local paths or generated rows.

The generator optimization gate uses the versioned, fingerprinted dynamic-INT8 baseline in `baselines/generator-int8-v1.json`; callers cannot replace it with an arbitrary byte count. Add `--enforce` in release automation when a failed or unmeasured gate must produce a nonzero exit. Omit it during exploratory campaigns so the report is still written for failed candidates.

## Blinded whole-service realism campaign

Build the production package, then export a fresh judge packet from the retained
pilot selection manifest, prompt, output schema, classifier, and INT8 SFT model:

~~~sh
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm mockserver-data-generator:realism-campaign --export \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --out /tmp/mockserver-data-generator-realism-evidence.json \
  --campaign-manifest-out /tmp/mockserver-data-generator-realism-campaign.json
~~~

The exporter requires the generator package directory to be clean and binds the
packet to its Git commit, compiled entry point, model artifacts, runtime,
selection manifest, prompt, and output schema. It randomizes the presentation
order deterministically and enforces at least 300 reviewed fields, all six
domains, and at least 50 fields from each of EDMX V2, EDMX V4, and CSN. OpenAPI
is excluded because it is not a first-release input for this OData mockserver
package. Generated values stay only in the explicitly selected external file.

After two independent providers have reviewed every blinded field with the
retained pilot prompt and JSON schema, compile their lineage-bound artifacts:

~~~sh
pnpm mockserver-data-generator:realism-campaign --compile \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --evidence /tmp/mockserver-data-generator-realism-evidence.json \
  --provider-artifact /tmp/provider-a.json \
  --provider-artifact /tmp/provider-b.json \
  --out /tmp/mockserver-data-generator-realism-consensus.json
~~~

The compiler uses pessimistic consensus and passes only when the overall score
and every domain and format score are at least 80%, no critical issue exists,
both providers are independent, and their artifacts match the exact evidence,
prompt, and schema fingerprints. Preparing a packet is not a realism pass; the
two external reviews remain a separate promotion gate.

Run native measurements first. Benchmark WebAssembly only if the native dependency closure leaves material size to recover; adopt it only when total installed/cache bytes improve materially without violating correctness, startup, latency, or memory gates.

The bounded backend screen runs identical classifier artifacts before committing to a much longer autoregressive WASM campaign:

~~~sh
node scripts/mockserver-data-generator-evaluation/bench-classifier-backend.mjs \
  --pilot-root /absolute/path/to/sap-ai-mockserver --backend native
node scripts/mockserver-data-generator-evaluation/bench-classifier-backend.mjs \
  --pilot-root /absolute/path/to/sap-ai-mockserver --backend wasm
~~~

Stop the WASM branch when this screen exceeds the frozen 1.5 times native p95 gate. Passing the screen would only authorize the full SFT and platform experiment; it would not select WASM by itself.
