# Mockserver data generator development kit

This development kit installs the unpublished MockGen package and the matching
unpublished FE mockserver host packages into an existing generated Fiori
application. It uses local npm tarballs, one standard sap-fe-mockserver
middleware, the existing ui5-mock.yaml, and the existing start-mock command.

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

~~~bash
pnpm mockserver-data-generator:dev-install -- \
  --app /absolute/path/to/fiori-app \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --verify
~~~

The command builds and packs the three current packages, installs those exact
tarballs, starts a bounded HTTP canary, and stops it. It does not leave a
development server running. Continue manual testing with the application's
unchanged command:

~~~bash
cd /absolute/path/to/fiori-app
npm run start-mock
~~~

Restore installer-owned application files after testing:

~~~bash
pnpm mockserver-data-generator:dev-install -- \
  --app /absolute/path/to/fiori-app \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --restore
~~~

Restore refuses to overwrite files edited after setup. Resolve such a conflict
manually rather than deleting the recovery journal.

## Build a portable archive

~~~bash
pnpm mockserver-data-generator:dev-kit -- \
  --host-root /absolute/path/to/open-ux-odata-worktree \
  --out /absolute/path/to/output
~~~

The JSON build report identifies the one exact archive by path, fingerprint,
SHA-256, package versions, package checksums, and source cleanliness. Use
--require-clean for an archive intended for BAS or review. A dirty build is
allowed for local iteration but is marked non-reproducible.

The archive contains only:

- three npm tarballs;
- a bundled transactional installer;
- a bundled configuration writer;
- an integrity/provenance manifest;
- concise instructions.

It contains no node_modules, model weights, datasets, caches, or judge results.
The archive is portable, but it is not inherently air-gapped: transitive
dependencies must be available from a registry or the target package-manager
cache.

## Install an extracted archive

~~~bash
node /absolute/path/to/extracted-kit/setup-local-fiori-app.mjs \
  --app /absolute/path/to/fiori-app \
  --verify
~~~

Useful flags:

- --dry-run: validate and show the package plan without changing the app.
- --offline: require package installation from the local cache.
- --verify: run and stop metadata and entity HTTP canaries.
- --restore: restore journaled files and reconcile dependencies.

Supported development fixtures cover OData V2 EDMX, OData V4 EDMX, and CDS
through @sap-ux/fe-mockserver-plugin-cds.
