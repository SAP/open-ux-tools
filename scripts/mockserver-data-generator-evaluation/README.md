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

Evaluate an exact platform-runtime candidate, rather than the repository's normal
`onnxruntime-node` installation, by adding:

~~~sh
  --runtime-tarball /absolute/path/to/onnxruntime-node-platform.tgz
~~~

The harness installs the archive with lifecycle scripts disabled, runs every
isolated classifier and SFT worker against its contained runtime entrypoint, and
records the archive SHA-256 in the evaluation report.

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
    "generationConfiguration": "generation-config.json",
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
`generationConfiguration` is optional. Supply a production-format configuration
when a candidate has model-specific sampling parameters, such as a completion
budget paired with a reduced tokenizer. The evaluator validates and binds both
the exact source artifact and its normalized configuration; omitting it retains
the frozen pilot sampling configuration derived from `configuration`.
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

## Integrated Fiori and first-use performance

Use a disposable npm-based Fiori elements application installed by the exact
reproducible development kit. Install it with the classifier/SFT model manifest
and verified cache so the standard `sap-fe-mockserver` path is exercised:

~~~sh
node /absolute/path/to/extracted-kit/setup-local-fiori-app.mjs \
  --app /absolute/path/to/scratch-fiori-app \
  --kit-root /absolute/path/to/extracted-kit \
  --model-manifest /absolute/path/to/model-manifest.json \
  --model-cache /absolute/path/to/verified-model-cache \
  --verify
~~~

From the matching clean `open-ux-tools` worktree, collect at least five cold
whole-service generations, five generated-data cache hits, and five first-use
model acquisitions:

~~~sh
pnpm mockserver-data-generator:measure-integration -- \
  --app /absolute/path/to/scratch-fiori-app \
  --model-manifest /absolute/path/to/model-manifest.json \
  --model-cache /absolute/path/to/verified-model-cache \
  --runtime-tarball /absolute/path/to/onnxruntime-node-platform.tgz \
  --output /tmp/mockserver-data-generator-integration.json \
  --runs 5
~~~

The runtime archive is installed with lifecycle scripts disabled. The harness
requires the clean generator commit, packed generator and host artifacts, model
manifest, model revision, runtime archive, machine, and Fiori fixture to match
the report. It also proves cache-hit startup does not initialize a model
session. Model acquisition uses a loopback mirror of the exact checksum-verified
artifacts and the production 30-second acquisition timeout. The report contains
only hashes, aggregate timings, and environment identities—never generated rows
or local paths.

Treat the application as a scratch fixture: changing the runtime candidate can
change `node_modules`, although the harness rejects changes to application-owned
configuration and lockfiles. Restore or reinstall the development kit before
using that application for another purpose.

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
  --evaluation-report /tmp/mockserver-data-generator-evaluation.json \
  --integration-report /tmp/mockserver-data-generator-integration.json \
  --runtime-tarball /absolute/path/to/onnxruntime-node-platform.tgz
~~~

Use a new output filename for every run; the harness refuses to overwrite evidence. It packs the current package, installs it in an isolated npm consumer, verifies the model cache, and reports package, dependency, runtime, model, generated-data-cache, latency, and memory measurements separately. When `--runtime-tarball` is used by all three commands, the footprint report rejects evaluation or integration evidence that is not bound to the same archive SHA-256. It binds imported model latency to the complete compiled generator tree, exact generation config, full frozen cohorts and seed, model artifacts, runtime, machine, and clean commit; smoke subsets cannot satisfy the footprint gate. The integration report additionally supplies cold whole-service generation, warm cache startup, first-use acquisition, and host-provider timings from the standard Fiori mockserver path. Missing integrated measurements remain `not-measured` and keep `footprintReady` false. Reports contain fingerprints and aggregate values but no local paths or generated rows.

The generator optimization target uses the versioned, fingerprinted dynamic-INT8 baseline in `baselines/generator-int8-v1.json`; callers cannot replace it with an arbitrary byte count. It remains visible in `missedTargets` but is not a hard release gate when the total product footprint passes. Add `--enforce` in release automation when a failed or unmeasured required gate must produce a nonzero exit. Omit it during exploratory campaigns so the report is still written for failed candidates.

## Blinded whole-service realism campaign

Build the production package, then export a fresh judge packet from an explicit
service-disjoint cohort plus the retained pilot prompt/output schema and the
checksum-verified classifier and INT8 SFT model:

~~~sh
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm mockserver-data-generator:realism-campaign --export \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --selection-manifest /absolute/path/to/final-cohort-v1.json \
  --model-manifest /absolute/path/to/model-manifest.json \
  --model-cache /absolute/path/to/verified-model-cache \
  --out /tmp/mockserver-data-generator-realism-evidence.json \
  --campaign-manifest-out /tmp/mockserver-data-generator-realism-campaign.json
~~~

The exporter requires the generator package directory to be clean. It verifies
every model file against the immutable manifest and binds the packet to the Git
commit, compiled entry point, model artifacts, runtime, selection manifest,
prompt, and output schema. Before writing the packet it also requires every
requested resource to be non-empty, validates the complete generated result,
and evaluates every frozen code/text, amount/currency, quantity/unit,
date-range, person/address, status, draft, and value-help assertion. It
randomizes presentation order deterministically and enforces at least 300
reviewed fields, all six domains, and at least 50 fields from each of EDMX V2,
EDMX V4, and CSN. OpenAPI is excluded because it is not a first-release input
for this OData mockserver package. Generated values stay only in the explicitly
selected external file.

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

If a provider cannot reliably return all 300+ reviews in one response, prepare
deterministic bounded inputs instead of weakening the coverage requirement:

~~~sh
pnpm mockserver-data-generator:realism-review-batches --prepare \
  --evidence /tmp/mockserver-data-generator-realism-evidence.json \
  --out-dir /tmp/provider-batches \
  --maximum-fields-per-batch 50
~~~

Run the retained pilot's `ml:review-provider` command once for every
`input-NNN.json` named by `manifest.json`. Each provider artifact must have a
new output path. Then assemble the exact set:

~~~sh
pnpm mockserver-data-generator:realism-review-batches --assemble \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --evidence /tmp/mockserver-data-generator-realism-evidence.json \
  --batch-manifest /tmp/provider-batches/manifest.json \
  --provider-artifact /tmp/provider-batches/provider-001.json \
  --provider-artifact /tmp/provider-batches/provider-002.json \
  --out /tmp/provider-complete.json
~~~

Repeat `--provider-artifact` for every manifest entry. The assembler rejects a
missing, duplicate, mixed-provider, schema-mismatched, or evidence-mismatched
batch. Its final artifact binds the full evidence source and records every
batch input and provider-artifact fingerprint. Batch files and provider output
remain external evidence and must not be committed to Open UX Tools.

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
