# Mockserver data generator BAS canary

Status: pending execution in an actual SAP Business Application Studio dev
space.

Local Linux or macOS results do not establish BAS proxy, certificate,
filesystem, preview-routing, or process behavior. Complete this record using a
clean archive produced with --require-clean.

Current clean archive candidate:

- dev-kit fingerprint: `2587b8efb75aa190ccb4de62b789713a31a798493aa808fb17bae000e1d077f5`
- archive SHA-256: `badcc3f241607999720e2d670986d7d73dfa37e5feb54545aba9a3be0fc5b4f9`
- archive size: 566,493 bytes; 10 entries
- source commits: `SAP/open-ux-tools` `e319240ce9f2af70e78ad08a02ae394e7030e439`; `SAP/open-ux-odata` `b64ee8b60519f129ad975465536204c78a15be1a`
- local handoff copy: `/absolute/path/to/mockserver-data-generator-dev-kit-2587b8efb75aa190.tgz`

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
contract. The exact archive passed separate standard and
retained-classifier/SFT canaries in fresh packed OData V2, OData V4, and
CDS-through-FE applications. It also passed the literal
`npm run start-mock` and `npm run start-mock -- --mockgen` workflow. All five
cold generations, warm-cache starts, and first-use acquisitions passed; warm
starts did not initialize model sessions. The current p95 values are
1,567.782 ms cold, 20.775 ms warm cache, 664.750 ms acquisition, and
1,568.577 ms host provider work. The local CONNECT proxy regression does not
substitute for an HTTPS proxy and certificate test inside BAS.

The current archive also contains the native-session lifecycle correction:
both MockGen ONNX backend adapters map their internal `dispose()` operation to
the runtime's actual `release()` API. A real native-addon contract on Node 22
and Node 24 proves that sessions reject inference after disposal. It also
contains the host API-version handshake: only a `--mockgen` start resolves the
application-installed middleware and requires capability version 1 before
Fiori is spawned. A plain `start-mock` performs no compatibility lookup. The
exact archive is therefore the current BAS functional candidate.

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
