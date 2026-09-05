# Mockserver data generator BAS canary

Status: pending execution in an actual SAP Business Application Studio dev
space.

Local Linux or macOS results do not establish BAS proxy, certificate,
filesystem, preview-routing, or process behavior. Complete this record using a
clean archive produced with --require-clean.

Current clean archive candidate:

- dev-kit fingerprint: `f1905ad2a4d61e1e4a0e7809fad806172d655cb98851857e7e29679e0435f44f`
- archive SHA-256: `4cfc35715eabc367c9926d1421ec73e3015d0c6576b65624931510126926d888`
- archive size: 561,891 bytes; 10 entries
- source commits: `SAP/open-ux-tools` `d65f9c1b5bbea6abeb96d921c9e079a97aeddcf6`; `SAP/open-ux-odata` `3556f352d0e4b8f7397bd30748110d2701cf0a1a`
- local handoff copy: `/Users/I335123/Downloads/mockserver-data-generator-dev-kit-f1905ad2a4d61e1e.tgz`

This candidate includes the flag-gated `start-mock` launcher, the current
classifier/SFT provider, adaptive wide-schema
batching, EDM maximum-length constrained decoding, optimized
constrained decoder, production 300-token config, generated-data cache,
reload-cancellation recovery, transactional installer recovery, and
repeat-install upgrade safety and the package-checked pilot-parity disposition.
It also includes fenced cross-process model-cache
acquisition, late-cancellation publication protection, the 200 MiB
preview/stable manifest ceiling, metadata-derived semantic coherence, and the
executable final-cohort gate. It also contains the packaged security guide,
pre-acquisition model-cache descendant checks, HTTPS-preserving bounded
redirects, environment-proxy routing, and an exact packed-document/link
contract. The exact archive passed a retained-classifier/SFT V4 canary and a
five-sample integrated campaign after correcting chunked-SFT cache statistics
and enforcing the package's production TypeScript safety rules for explicit
returns, unsafe assignments, default paths, consistent returns, and non-null
assertions.
All five cold generations, warm-cache starts, and first-use acquisitions
passed; warm starts did not initialize model sessions. The current p95 values
are 2,511.287 ms cold, 19.737 ms warm cache, 618.199 ms acquisition, and
2,512.224 ms host provider work. Earlier clean archives remain the
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
npm run start-mock -- --mockgen
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
npm run start-mock -- --mockgen
```

The learned `--verify` result must contain both `modelVerified: true` and
`learnedRuntimeVerified: true`. The unflagged manual command must use standard
generation; only the command with `--mockgen` may report provider/model
execution. A provider/HTTP pass without those fields is not a classifier/SFT
BAS pass.

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
