# Mockserver data generator platform-runtime release

Status: source builder implemented and verified on macOS arm64; release
execution, approval, hosting, and signing remain pending.

## Purpose

The published MockGen package must stay small and must not install the
all-platform `onnxruntime-node` package into every Fiori application. A flagged
first start instead downloads the exact native files for the developer's
current operating system and CPU. Later starts verify and reuse that local
cache without network access.

This procedure creates one such runtime file set. It does not upload, sign,
approve, or publish anything.

## Supported build targets

Run the builder natively on each target:

- `darwin-arm64`
- `darwin-x64`
- `linux-x64`
- `win32-x64`

Use Node 22.22.2 or a supported Node 24 version, the repository-pinned pnpm,
and a clean checkout of the approved source commit. The installed
`onnxruntime-node` and `onnxruntime-common` packages must have the exact same
version. The current candidate pins `1.24.3`.

## Build one target

Choose a new absolute output directory. Both URLs must be credential-free
HTTPS URLs containing an immutable 40-to-64-character commit or content hash.
The artifact base URL must end in `/`.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @sap-ux/mockserver-data-generator build

node packages/mockserver-data-generator/scripts/build-platform-runtime.mjs \
  --out /absolute/new/output/runtime-target \
  --artifact-base-url https://approved.example/<immutable-id>/ \
  --sbom-url https://approved.example/<immutable-id>/runtime.spdx.json
```

The output contains:

- `files/runtime/<target>/node_modules/...`: the files to host at the declared
  artifact URLs; and
- `runtime-artifact.json`: the format-2 `runtimes[]` entry with package,
  version, target, entrypoint, byte sizes, SHA-256 checksums, license, source,
  and SBOM references.

The builder refuses an existing output directory, symbolic links, unsupported
filesystem entries, mutable URLs, mismatched runtime versions, unsupported
targets, and a file set above 64 MiB. It copies only JavaScript package support
files and the native binary directory for the current target. It executes no
install hook and performs no network or publication operation.

## Verify before hosting

For each target:

1. Rebuild twice from the same clean source and dependency lock. Require an
   identical `runtime-artifact.json` fingerprint and identical file checksums.
2. Import the copied `entry` from outside the application dependency tree and
   execute the native ONNX contract on Node 22 and Node 24.
3. Generate and approve the SBOM, provenance, license, vulnerability, and
   signing evidence for the exact file set.
4. Upload only to the immutable URLs already recorded in the descriptor, then
   verify every hosted byte count and SHA-256.
5. Assemble exactly one descriptor for each of the four targets into the
   package-owned format-2 model manifest. Do not use a mutable channel URL in
   the manifest.
6. Run cold acquisition, warm offline reuse, corruption, cancellation,
   proxy/certificate, latency, RSS, and rollback canaries on the complete
   Node/OS matrix and in BAS.

The local macOS arm64 proof currently emits 30 files, 36,280,317 bytes, and
fingerprint
`e43288a91114ae6ba8b1b7d0ab95d00d50c6e7fb8a18f4ab7150c74bcf7f270a`.
This is implementation evidence, not an approved hosted release artifact.

## Publication boundary

Only after all four target descriptors and the model artifacts are approved
should the release owner place their immutable references in
`packages/mockserver-data-generator/resources/model-manifest.json`, assign a
publishable package version, create the npm prerelease, and verify the public
tarball. Keep the current `0.0.0` placeholder and development manifest until
then.
