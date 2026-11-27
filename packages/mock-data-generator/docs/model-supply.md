# Model supply

The package ships two learned components, described by `resources/models/manifest.json`:

| Component             | Kind         | Base model                               | Purpose                                                        |
| --------------------- | ------------ | ---------------------------------------- | -------------------------------------------------------------- |
| `semantic-classifier` | `classifier` | `sentence-transformers/all-MiniLM-L6-v2` | Embeds field context and routes fields to semantic roles       |
| `row-generator`       | `sft`        | `HuggingFaceTB/SmolLM2-135M-Instruct`    | Proposes values for fields no deterministic provider can serve |

The manifest's `bundleId` and `revision` identify the current bundle; `getMockDataGeneratorInfo()` reports them. Upstream licenses and redistribution notes are in [model licenses and provenance](model-licenses.md).

**The models are English-only.** The tokenizers, the prompt and the training format are English, and field names are split into ASCII/English words before they reach a model. Services with field names, labels or descriptions in other languages still generate (the deterministic tiers do not depend on language), but the classifier and the row generator give them no useful signal.

## What is tracked and what is built

All files live under `resources/models/`, at the paths the manifest declares in `components[].files[].path`.

| Path                             | Role                | Supply                                                                      |
| -------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `manifest.json`                  | manifest            | tracked in git                                                              |
| `classifier/encoder.onnx`        | `encoder`           | downloaded: `Xenova/all-MiniLM-L6-v2` `onnx/model_quantized.onnx`           |
| `classifier/vocab.txt`           | `vocabulary`        | downloaded: `Xenova/all-MiniLM-L6-v2` `vocab.txt`                           |
| `classifier/head.json`           | `classifier-head`   | tracked in git                                                              |
| `classifier/relevance-head.json` | `relevance-head`    | tracked in git                                                              |
| `classifier/concept-head.json`   | `concept-head`      | tracked in git                                                              |
| `sft/model.onnx`                 | `model`             | built: `HuggingFaceTB/SmolLM2-135M-Instruct` + `training/row-model/adapter` |
| `sft/tokenizer.json`             | `tokenizer`         | built with the model                                                        |
| `sft/generation-config.json`     | `generation-config` | tracked in git                                                              |

### Building the untracked model files

`pnpm build:models` (`scripts/build-models.mjs`) downloads the encoder and vocabulary at the revision pinned as `ENCODER_REVISION` in that script. It builds the row model and its tokenizer with `training/row-model/export.py`, which downloads the base model at its `BASE_REVISION`, merges the LoRA adapter, exports to ONNX and applies int8 dynamic quantization. A file that already matches the manifest is not rebuilt. The script fails unless every model file then matches the manifest. With the Python versions in `training/requirements.txt` the build is byte-identical to the pinned files. Pass `--python <executable>` to choose the interpreter.

Without the ONNX files, `deterministic` mode still works, because it never verifies or loads a model. In `auto` or `learned` mode the first request that needs a model fails with `MockGenError` code `RESOURCE_INTEGRITY`, naming the missing artifacts.

### Tracked model files must stay byte-identical

The manifest pins every file by SHA-256. Do not reformat the tracked model files: the root `.prettierignore` and the package `format` script exclude `resources/models/`.

## How integrity is verified

| Level     | What is hashed                                                                                       | Where it is recorded       |
| --------- | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| File      | Byte size and SHA-256 of each artifact                                                               | `components[].files[]`     |
| Component | SHA-256 over `role`, `path` and `sha256` of its files, ordered by role                               | `components[].fingerprint` |
| Manifest  | SHA-256 over the canonical JSON of `bundleId`, `runtime`, component fingerprints and dataset digests | `revision`                 |
| Datasets  | Byte size and SHA-256 of the value banks, semantic rules and role registry                           | `datasets[]`               |

At run time:

1. **At session creation** (`createMockDataGenerator` in `src/standalone.ts`) the manifest below the session's [resource root](../README.md#bundling-the-package) is parsed strictly, and each of the three dataset files below that root is re-hashed and compared with it. Any mismatch raises `RESOURCE_INTEGRITY`.
2. **On first use** the value-bank store, the semantic rule store and the role registry are read once, hashed in memory from the exact bytes that are parsed, and parsed strictly; the manifest must declare exactly those digests. A parse failure raises `RESOURCE_INTEGRITY`. Importing the package reads no resource file.
3. **Before the first model load** `verifyPackagedModels` in `src/model/packaged-models.ts` checks the size and SHA-256 of every model file, once per process, models directory and manifest revision, and validates the classifier head contract. This never happens in `deterministic` mode. A missing or corrupt file raises `RESOURCE_INTEGRITY`.
4. **At model load** the installed `onnxruntime-node` must have the version the manifest's `runtime` names. A verified component that still fails to load (a missing native runtime or another version) is reported as the warning diagnostic `CLASSIFIER_RUNTIME_UNAVAILABLE` or `SFT_RUNTIME_UNAVAILABLE`, and generation continues on the deterministic tiers.

**Cross-pins.** The classifier head pins the canonical fingerprint of the role registry (`registryFingerprint`), the serializer fingerprint, and the digests of the encoder and vocabulary (`encoderSha256`, `tokenizerSha256`), so a head trained against other roles or another encoder is rejected. The routing policy and thresholds are kept in the semantic rule store, outside the registry, so that tuning them does not invalidate a packaged head.

## The SFT generation config

`sft/generation-config.json` holds the model shape (layers, heads, hidden size), the sampling options and, under `promptTemplate`, the prompt texts of prompt contract 1: the system prompt, the example row and the ChatML turn markers. `parseSftConfiguration` and `parseSftPromptTemplate` (in `src/model/learned-runtime.ts` and `src/model/sft-runtime.ts`) parse it strictly; unknown keys, empty texts and non-scalar example values are rejected. The user-prompt skeleton around these texts is rendering code in `renderRowPrompt`.

Changing any of these texts changes the file's digest, so it changes the row-generator fingerprint and the manifest revision. The model answer cache is namespaced by the manifest revision and keyed by the model fingerprint and the rendered prompt, so cached answers of an earlier bundle are not reused.

## Rebuilding and checking the manifest

Regenerate the manifest after changing any model file, value bank, rule or the role registry. Every declared model file must be present; `pnpm build:models` downloads or builds the untracked ones, and exits with an error while the manifest is stale. Run from `packages/mock-data-generator`:

| Command                                                                               | Effect                                                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `node scripts/build-model-manifest.mjs`                                               | Rewrites `resources/models/manifest.json` from the files on disk                                      |
| `node scripts/build-model-manifest.mjs --check`                                       | Prints `{ upToDate, revision }`; exits with 1 when the manifest is stale                              |
| `node scripts/build-model-manifest.mjs --review-status approved --review-record FILE` | Rebuilds and records an approval, pinned to the SHA-256 of the review record                          |
| `pnpm check:package`                                                                  | Packs the package and verifies the packed manifest, models, datasets, head contract and identity      |
| `pnpm check:release`                                                                  | Also requires the release evidence listed under [Releasing](#releasing); a maintainer step, not in CI |

The script treats the existing manifest as a template. Edit `bundleId` and each component's `version` by hand for a new release; everything else is derived: file sizes and digests, component fingerprints, the classifier contract (from `classifier/head.json`, which must use input format `v3` and match the packaged encoder and vocabulary digests), the optional relevance and concept heads, the dataset entries and the revision. Every concept of the concept head must have its bank in the value-bank store. An approved provenance is kept while the revision is unchanged and withdrawn when the content changes.

## Releasing

The package is `private` in the workspace, so the shared changesets release skips it. `.github/workflows/mock-data-generator-release.yml` publishes it instead, when `package.json` changes on `main` or on a manual run (manual runs default to a dry run that builds and verifies without publishing). The workflow:

1. skips version `0.0.0`, the placeholder before the first changeset version;
2. continues only when `npm view` answers `E404` for the version; a published version skips the run, and any other registry error fails it;
3. runs `pnpm build`, `pnpm lint` and `pnpm test`;
4. runs `pnpm build:models` and fails unless every model file matches the manifest;
5. removes the `private` flag (`npm pkg delete private`), so the verified tarball is the published one;
6. packs once, runs `pnpm check:package --archive <tarball>`, and checks the archive's SHA-256 before publishing that file.

Before raising the version, a maintainer runs `pnpm check:release --archive <tarball>` locally. Without `--archive`, either check packs the current directory. Release verification requires a qualified classifier head with a complete runtime contract, a qualified relevance head, a content-derived manifest, approved provenance, and a realism sweep report for each release profile in `MOCKGEN_REALISM_REPORTS` (a path list).

Run `scripts/realism-sweep.mjs` outside CI for both `editor/sft-off` and `editor/sft-on`. Assess the same nonempty corpus for each profile's baseline and candidate. A qualifying candidate report covers every service, identifies the candidate build, and records no hard-check findings or baseline regressions. The `editor/sft-on` profile uses the Data Editor worker's 30-second deadline.
