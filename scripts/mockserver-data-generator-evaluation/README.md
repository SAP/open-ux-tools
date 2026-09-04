# Mockserver data generator model evaluation

This harness evaluates the production `@sap-ux/mockserver-data-generator` runtime against the fixed classifier and SFT cohorts retained by the successful MockGen pilot. It does not copy model weights, training data, or generated rows into `open-ux-tools`.

Build the package and run the native candidates from Node 22:

~~~sh
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm mockserver-data-generator:evaluate-models -- \
  --pilot-root /absolute/path/to/sap-ai-mockserver \
  --output /tmp/mockserver-data-generator-evaluation.json \
  --evidence-dir /tmp/mockserver-data-generator-judge-evidence
~~~

The default campaign executes the pilot classifier plus the INT8 and INT4 SFT exports. Add `--sft-candidates fp32,int8,int4` when the larger FP32 graph is available and the host has sufficient memory. `--max-sft-cases` creates a deterministic smoke subset; omit it for the full fixed held-out cohort.

The report contains exact artifact bytes and SHA-256 hashes, governed classifier cohort counts, classifier accuracy/macro-F1/routed precision/coverage, SFT parse/exact-key/fill rates, load and generation latency, and observed process memory. Generated values are written only when an external evidence directory is supplied. A new realism judgment must use that evidence file and record its checksum; historical pilot judgments are comparison baselines, not promotion evidence.

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
