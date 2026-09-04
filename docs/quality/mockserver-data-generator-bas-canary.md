# Mockserver data generator BAS canary

Status: pending execution in an actual SAP Business Application Studio dev
space.

Local Linux or macOS results do not establish BAS proxy, certificate,
filesystem, preview-routing, or process behavior. Complete this record using a
clean archive produced with --require-clean.

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

~~~bash
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
~~~

After manual preview testing, stop the server and restore:

~~~bash
node "$KIT_ROOT/setup-local-fiori-app.mjs" \
  --app "$PWD" --restore
~~~

## Results to record

- archive checksum:
- package integrity and export verification:
- exactly one sap-fe-mockserver:
- provider resolution:
- $metadata URL and status:
- entity URL and status:
- non-empty row count:
- manual Fiori preview:
- restore result:
- remaining installer-created files:
- logs or failure classification:

The BAS gate passes only when the HTTP canary, manual preview, and safe restore
all pass using the exact recorded archive.
