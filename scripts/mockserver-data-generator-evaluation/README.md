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

Run native measurements first. Benchmark WebAssembly only if the native dependency closure leaves material size to recover; adopt it only when total installed/cache bytes improve materially without violating correctness, startup, latency, or memory gates.

The bounded backend screen runs identical classifier artifacts before committing to a much longer autoregressive WASM campaign:

~~~sh
node scripts/mockserver-data-generator-evaluation/bench-classifier-backend.mjs \
  --pilot-root /absolute/path/to/sap-ai-mockserver --backend native
node scripts/mockserver-data-generator-evaluation/bench-classifier-backend.mjs \
  --pilot-root /absolute/path/to/sap-ai-mockserver --backend wasm
~~~

Stop the WASM branch when this screen exceeds the frozen 1.5 times native p95 gate. Passing the screen would only authorize the full SFT and platform experiment; it would not select WASM by itself.
