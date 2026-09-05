# Mockserver data generator development kit

This development kit installs the unpublished MockGen package and the matching
unpublished FE mockserver host packages into an existing generated Fiori
application. It uses local npm tarballs, one standard sap-fe-mockserver
middleware, the existing ui5-mock.yaml, and the existing start-mock command.
The production config writer now creates the dependency, provider, and launcher
wiring; this kit replaces the registry dependency with the exact unpublished
tarball and adds development-only model paths when requested.

Model weights, training data, and judge outputs are deliberately excluded. The
default HTTP canary proves package discovery, provider loading, metadata
handling, generated rows, and deterministic fallback. Learned-model quality is
verified separately against an explicitly prepared model cache.

## Prerequisites

- Node.js 22.22.2 or newer
- the open-ux-tools and matching open-ux-odata feature worktrees
- an existing generated Fiori application with package.json,
  webapp/manifest.json, and ui5.yaml or ui5-mock.yaml
- registry access, or a complete package-manager cache when using --offline

## Direct local development

From the open-ux-tools worktree:

```bash
pnpm mockserver-data-generator:dev-install -- \
  --app /absolute/path/to/fiori-app \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --verify
```

The command builds and packs the three current packages, installs those exact
tarballs, starts a bounded HTTP canary, and stops it. It does not leave a
development server running. The canary writes its temporary debug configuration
under the operating system's temporary directory rather than inside the Fiori
project, so server verification itself also works after the installed project
is made read-only when its model and generated-data caches remain writable
elsewhere. Installation and restore still require a writable application.
Continue manual testing with the application's single wrapped command. Without
the flag it uses standard mockserver generation; with the flag it activates
MockGen:

```bash
cd /absolute/path/to/fiori-app
npm run start-mock
npm run start-mock -- --mockgen
```

Restore installer-owned application files after testing:

```bash
pnpm mockserver-data-generator:dev-install -- \
  --app /absolute/path/to/fiori-app \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --restore
```

Restore refuses to overwrite files edited after setup. Resolve such a conflict
manually rather than deleting the recovery journal.

## Build a portable archive

```bash
pnpm mockserver-data-generator:dev-kit -- \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --out /absolute/path/to/output
```

The JSON build report identifies the one exact archive by path, fingerprint,
SHA-256, package versions, package checksums, and source cleanliness. Use
--require-clean for an archive intended for BAS or review. A dirty build is
allowed for local iteration but is marked non-reproducible.

The archive contains only:

- three npm tarballs;
- a bundled transactional installer;
- a bundled configuration writer;
- a model-free bridge for staging an explicitly supplied retained pilot bundle;
- an integrity/provenance manifest;
- concise instructions.

It contains no node_modules, model weights, datasets, caches, or judge results.
The archive is portable, but it is not inherently air-gapped: transitive
dependencies must be available from a registry or the target package-manager
cache.

## Exercise the classifier and SFT model

The default installer canary intentionally proves the package and standard
mockserver integration without downloading model weights. To test the learned
path, first create or acquire a production-format manifest and verified cache.

For the retained pilot repository or extracted pilot bundle, the development
bridge stages the existing classifier and INT8 SFT files directly into the
production cache shape and writes a development-only immutable manifest:

```bash
MODEL_OUTPUT=/absolute/path/to/local-mockgen-model

# From the open-ux-tools worktree:
pnpm mockserver-data-generator:prepare-pilot-model -- \
  --pilot-root /absolute/path/to/sap-ai-mockserver-or-extracted-pilot \
  --cache "$MODEL_OUTPUT/cache" \
  --manifest-out "$MODEL_OUTPUT/model-manifest.json"

# Or, from an extracted portable development kit in BAS:
node ./prepare-pilot-model-cache.mjs \
  --pilot-root /absolute/path/to/extracted-pilot \
  --cache "$MODEL_OUTPUT/cache" \
  --manifest-out "$MODEL_OUTPUT/model-manifest.json"
```

The bridge does not modify the pilot, contact a network endpoint, or put model
files in `open-ux-tools`. It rejects symbolic-link artifacts, stages the bundle
atomically, and can be rerun only when the existing manifest and cache match.
It is a development adapter for the retained pilot assets, not a public model
distribution mechanism.

Install the development kit with the staged manifest and cache. The installer
adds the manifest's exact `onnxruntime-node` version, configures offline model
paths on the existing provider, runs the packaged production `verify` command,
and requires the HTTP canary to report both classifier and SFT readiness:

```bash
APP_ROOT=/absolute/path/to/fiori-app
MODEL_OUTPUT=/absolute/path/to/local-mockgen-model
MODEL_MANIFEST="$MODEL_OUTPUT/model-manifest.json"
MODEL_CACHE="$MODEL_OUTPUT/cache"

pnpm mockserver-data-generator:dev-install -- \
  --app "$APP_ROOT" \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --model-manifest "$MODEL_MANIFEST" \
  --model-cache "$MODEL_CACHE" \
  --verify
```

For an approved remotely hosted production-format manifest, use the same CLI's
`prepare` command instead; it downloads and verifies only the immutable sizes
and SHA-256 values declared by that manifest.

Keep the existing `sap-fe-mockserver` entry and single `npm run start-mock`
command. Add `-- --mockgen` only when testing MockGen.
This is an explicit development workflow: the kit does not contain a model
manifest, native runtime, or model weights, and it never silently downloads them
during installation.

Run the default deterministic canary separately from the learned-path check so
a package-wiring pass is not mistaken for classifier/SFT readiness. An actual
BAS run remains necessary to qualify BAS proxy, certificate, filesystem, and
native-runtime behavior.

## Install an extracted archive

```bash
node /absolute/path/to/extracted-kit/setup-local-fiori-app.mjs \
  --app /absolute/path/to/fiori-app \
  --kit-root /absolute/path/to/extracted-kit \
  --model-manifest /absolute/path/to/local-mockgen-model/model-manifest.json \
  --model-cache /absolute/path/to/local-mockgen-model/cache \
  --verify
```

Useful flags:

- --dry-run: validate and show the package plan without changing the app.
- --offline: require package installation from the local cache.
- --verify: run and stop metadata and entity HTTP canaries.
- --model-manifest and --model-cache: install and require the learned classifier/SFT path.
- --restore: restore journaled files and reconcile dependencies.

Supported development fixtures cover OData V2 EDMX, OData V4 EDMX, and CDS
through @sap-ux/fe-mockserver-plugin-cds.
