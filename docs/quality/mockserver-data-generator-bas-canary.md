# Mockserver data generator BAS canary

Status: pending execution in an actual SAP Business Application Studio dev
space.

Local Linux or macOS results do not establish BAS proxy, certificate,
filesystem, preview-routing, or process behavior. Complete this record using a
clean archive produced with --require-clean.

Current clean archive candidate:

- dev-kit fingerprint: `3a16a758a6e582080b7769dc34c884dab85f5dad00dfc17ff3b80459e392b774`
- archive SHA-256: `cb2a72cc2973631cda6d2f00b2bf810b634c5d720750b816d932618ec7281db1`
- archive size: 550,571 bytes; 10 entries
- source commits: `SAP/open-ux-tools` `40393c7c6f98d13ad79301b83be7ab24a84a7e46`; `SAP/open-ux-odata` `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- local handoff copy: `/Users/I335123/Downloads/mockserver-data-generator-dev-kit-3a16a758a6e58208.tgz`

This candidate includes the current classifier/SFT provider, adaptive wide-schema
batching, EDM maximum-length constrained decoding, optimized
constrained decoder, production 300-token config, generated-data cache,
reload-cancellation recovery, transactional installer recovery, and
repeat-install upgrade safety. It also includes fenced cross-process model-cache
acquisition, late-cancellation publication protection, the 200 MiB
preview/stable manifest ceiling, metadata-derived semantic coherence, and the
executable final-cohort gate. It also contains the packaged security guide,
pre-acquisition model-cache descendant checks, HTTPS-preserving bounded
redirects, environment-proxy routing, and an exact packed-document/link
contract. The exact archive passed a retained-classifier/SFT V4 canary and a
five-sample integrated campaign after correcting chunked-SFT cache statistics.
All five cold generations, warm-cache starts, and first-use acquisitions
passed; warm starts did not initialize model sessions. The current p95 values
are 2,595.700 ms cold, 19.072 ms warm cache, 1,221.860 ms acquisition, and
2,596.510 ms host provider work. Earlier clean archives remain the
cross-format V2/V4/CDS and read-only evidence. The local CONNECT proxy
regression does not substitute for an HTTPS proxy and certificate test inside
BAS.

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
