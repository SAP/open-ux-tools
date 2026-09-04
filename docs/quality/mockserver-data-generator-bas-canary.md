# Mockserver data generator BAS canary

Status: pending execution in an actual SAP Business Application Studio dev
space.

Local Linux or macOS results do not establish BAS proxy, certificate,
filesystem, preview-routing, or process behavior. Complete this record using a
clean archive produced with --require-clean.

Current clean archive candidate:

- dev-kit fingerprint: `62cb961976060a2b0a31cb35003519150fcd6873a976720e971bf4fb8d6117dc`
- archive SHA-256: `401913cc38854ecffbf5de82995e784aec12e983719fb6bf97ec6313cb3e527b`
- archive size: 525,054 bytes; 10 entries
- source commits: `SAP/open-ux-tools` `041d8ecfdca0666135bbaca6147ed76d8b57bea1`; `SAP/open-ux-odata` `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`

This candidate includes the current classifier/SFT provider, generated-data
cache, reload-cancellation recovery, transactional installer recovery, and
repeat-install upgrade safety. Its exact deterministic upgrade and
retained-pilot learned OData V2 HTTP and restore canaries are recorded in the
local canary report. The earlier clean archive remains the cross-format learned
V2/V4/CDS evidence; run the procedure below with the current archive to qualify
the same learned path in BAS.

## Inputs to record

- BAS dev-space image and region:
- Node and npm versions:
- generated application type and sanitized fixture fingerprint:
- dev-kit fingerprint:
- dev-kit archive SHA-256:
- package names, versions, and resolved local file specifications:
- model state: deterministic fallback, fake cache, or qualified candidate
- operator and timestamp:

Do not record credentials, tokens, customer metadata, generated application
data, prompts, or model outputs.

## Procedure

```bash
KIT_ARCHIVE="/absolute/path/to/mockserver-data-generator-dev-kit-<fingerprint>.tgz"
KIT_SHA256="<exact-sha256-from-build-report>"
KIT_ROOT="$HOME/tools/mockserver-data-generator-dev-<fingerprint>"

node -e 'const [a,b,c]=process.versions.node.split(".").map(Number);if(a<22||(a===22&&(b<22||(b===22&&c<2))))throw Error("Node >=22.22.2 is required")'
printf '%s  %s\n' "$KIT_SHA256" "$KIT_ARCHIVE" | sha256sum --check --strict -
test ! -e "$KIT_ROOT"
mkdir -p "$KIT_ROOT"
tar --extract --gzip --file "$KIT_ARCHIVE" \
  --directory "$KIT_ROOT" --strip-components=1 \
  --no-same-owner --no-same-permissions

node "$KIT_ROOT/setup-local-fiori-app.mjs" \
  --app "$PWD" --verify
npm run start-mock
```

To exercise the proven classifier/SFT path, separately transfer an authorized
copy of the retained pilot bundle, then stage and verify it without putting
weights in the development kit:

```bash
PILOT_ROOT="/absolute/path/to/extracted-retained-pilot"
MODEL_ROOT="$HOME/tools/mockserver-data-generator-model-2bf437ed75f992b6"

node "$KIT_ROOT/prepare-pilot-model-cache.mjs" \
  --pilot-root "$PILOT_ROOT" \
  --cache "$MODEL_ROOT/cache" \
  --manifest-out "$MODEL_ROOT/model-manifest.json"

node "$KIT_ROOT/setup-local-fiori-app.mjs" \
  --app "$PWD" \
  --kit-root "$KIT_ROOT" \
  --model-manifest "$MODEL_ROOT/model-manifest.json" \
  --model-cache "$MODEL_ROOT/cache" \
  --verify
npm run start-mock
```

The learned `--verify` result must contain both `modelVerified: true` and
`learnedRuntimeVerified: true`. A provider/HTTP pass without those fields is not
a classifier/SFT BAS pass.

After manual preview testing, stop the server and restore:

```bash
node "$KIT_ROOT/setup-local-fiori-app.mjs" \
  --app "$PWD" --restore
```

## Results to record

- archive checksum:
- package integrity and export verification:
- exactly one sap-fe-mockserver:
- provider resolution:
- $metadata URL and status:
- entity URL and status:
- non-empty row count:
- manual Fiori preview:
- exact `onnxruntime-node` dependency and classifier/SFT readiness, when exercised:
- restore result:
- remaining installer-created files:
- logs or failure classification:

The BAS gate passes only when the HTTP canary, manual preview, and safe restore
all pass using the exact recorded archive.
