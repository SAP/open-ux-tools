# Mockserver data generator BAS canary

Status: pending execution in an actual SAP Business Application Studio dev
space.

Local Linux or macOS results do not establish BAS proxy, certificate,
filesystem, preview-routing, or process behavior. Complete this record using a
clean archive produced with --require-clean.

Current clean archive candidate:

- dev-kit fingerprint: `ce2d81475039330022b721553a5d41d6f55542a8bfc7625f4882887a56439ac0`
- archive SHA-256: `8ced1e0f4003406de274a95e3d04a7f955facb045375299dea55dd243f31a682`
- archive size: 573,685 bytes; 10 entries
- source commits: `SAP/open-ux-tools` `ffdb7d6a425616a930c522c6e72fecc1938b373c`; `SAP/open-ux-odata` `b64ee8b60519f129ad975465536204c78a15be1a`
- local handoff copy: `/Users/I335123/Downloads/mockserver-data-generator-dev-kit-ce2d814750393300.tgz`

Optional retained learned-model input for the classifier/SFT canary:

- archive: `sap-ai-mockserver-llm-pilot-0.12.0.tgz`
- archive SHA-256: `d5b0f5d72c1adf0f72c6b4a54f83d44e6ab0a2c2213c4ec38b057209626e9364`
- archive size: 131,826,730 bytes
- model fingerprint: `8241c95937623d6b5e61e6057f85e3ab5ede22a2bc0e57f221092db9bc8011da`
- release state: `experimental-integration-only`; this is retained test input, not a production release
- local handoff copy: `/Users/I335123/Downloads/sap-ai-mockserver-llm-pilot-0.12.0.tgz`

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
retained-classifier/SFT canaries in a fresh packed OData V4 application. The
immediately preceding compatibility archive passed the same paths in fresh
OData V2, OData V4, and CDS-through-FE applications, including the literal
`npm run start-mock` and `npm run start-mock -- --mockgen` workflow. The current
archive also reports supplied learned components as unavailable and omits their
fingerprints when deterministic mode explicitly suppresses them. In the retained
performance campaign, all five cold generations, warm-cache starts, and
first-use acquisitions passed; warm starts did not initialize model sessions.
Those retained p95 values are
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

This archive also contains the production format-2 acquisition code: a future
published package downloads only the current platform runtime together with
the classifier/SFT files and reuses its verified cache. The BAS archive itself
remains an unpublished development tool. Its optional retained-pilot procedure
below still installs the exact development runtime explicitly; that extra step
is not part of the eventual Fiori developer workflow. The source commit also
contains the repeatable per-platform runtime builder used by the future release
pipeline; it is not installed into the Fiori application.

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
KIT_ARCHIVE="$HOME/projects/mockserver-data-generator-dev-kit-ce2d814750393300.tgz"
KIT_SHA256="8ced1e0f4003406de274a95e3d04a7f955facb045375299dea55dd243f31a682"
KIT_ROOT="$HOME/tools/mockserver-data-generator-dev-ce2d814750393300"

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
PILOT_ARCHIVE="$HOME/projects/sap-ai-mockserver-llm-pilot-0.12.0.tgz"
PILOT_SHA256="d5b0f5d72c1adf0f72c6b4a54f83d44e6ab0a2c2213c4ec38b057209626e9364"
PILOT_ROOT="$HOME/tools/sap-ai-mockserver-llm-pilot-0.12.0"
MODEL_ROOT="$HOME/tools/mockserver-data-generator-model-2bf437ed75f992b6"

printf '%s  %s\n' "$PILOT_SHA256" "$PILOT_ARCHIVE" | sha256sum --check --strict -
test ! -e "$PILOT_ROOT"
mkdir -p "$PILOT_ROOT"
tar --extract --gzip --file "$PILOT_ARCHIVE" \
  --directory "$PILOT_ROOT" --strip-components=1 \
  --no-same-owner --no-same-permissions

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
