# Model supply

The package ships two learned components, described by `resources/models/manifest.json`:

| Component             | Kind         | Base model                               | Purpose                                                        |
| --------------------- | ------------ | ---------------------------------------- | -------------------------------------------------------------- |
| `semantic-classifier` | `classifier` | `sentence-transformers/all-MiniLM-L6-v2` | Embeds field context and routes fields to semantic roles       |
| `row-generator`       | `sft`        | `HuggingFaceTB/SmolLM2-135M-Instruct`    | Proposes values for fields no deterministic provider can serve |

Upstream licenses, revisions and redistribution notes are in [model licenses and provenance](model-licenses.md). The current release bundle is `mockgen-v1`, manifest revision `590bc99dc3429931e878959f0c279fb299a3d1d82ba3fa2faab03eb9fa0445cc`.

**The models are English-only.** The tokenizers, the prompt and the training format are English, and field names are split into ASCII/English words before they reach a model. Services with field names, labels or descriptions in other languages still generate (the deterministic tiers do not depend on language), but the classifier and the row generator give them no useful signal.

## What is tracked and what is supplied

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

`pnpm build:models` (`scripts/build-models.mjs`) downloads the encoder and vocabulary at Hugging Face revision `751bff37`, builds the row model and its tokenizer with `training/row-model/export.py` (base revision `12fd25f7`, merge the LoRA adapter, ONNX export, int8 dynamic quantization), and fails unless every model file matches the manifest. With the Python versions in `training/requirements.txt` the build is byte-identical to the pinned files. Pass `--python <executable>` to choose the interpreter. Publishing runs this in `.github/workflows/mock-data-generator-release.yml` before `pnpm check:package`.

Without the ONNX files, `deterministic` mode still works, because it never verifies or loads a model. In `auto` or `learned` mode the first request that needs a model fails with `MockGenError` code `RESOURCE_INTEGRITY`, naming the missing artifacts.

### Tracked model files must stay byte-identical

The manifest pins every file by SHA-256, and the classifier head pins `encoderSha256`, `tokenizerSha256` and `registryFingerprint`. Do not reformat the tracked model files: the root `.prettierignore` and the package `format` script exclude `resources/models/`.

## How integrity is verified

| Level     | What is hashed                                                                                       | Where it is recorded       |
| --------- | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| File      | Byte size and SHA-256 of each artifact                                                               | `components[].files[]`     |
| Component | SHA-256 over `role`, `path` and `sha256` of its files, ordered by role                               | `components[].fingerprint` |
| Manifest  | SHA-256 over the canonical JSON of `bundleId`, `runtime`, component fingerprints and dataset digests | `revision`                 |
| Datasets  | Byte size and SHA-256 of the value banks, semantic rules and role registry                           | `datasets[]`               |

At run time:

- When a session is created, `src/standalone.ts` reads and strictly parses the manifest, checks that it declares exactly the bytes of the value-bank store, rule store and role registry the package loaded, and verifies the remaining datasets.
- Before a learned component is first needed, `verifyPackagedModels` in `src/model/packaged-models.ts` checks the size and SHA-256 of every model file (once per process and manifest revision) and validates the classifier head contract. This never happens in `deterministic` mode.
- A missing or corrupt artifact raises `MockGenError` with code `RESOURCE_INTEGRITY`. A verified component that still fails to load (for example a missing native runtime) is reported as the warning diagnostic `CLASSIFIER_RUNTIME_UNAVAILABLE` or `SFT_RUNTIME_UNAVAILABLE`, and generation continues on the deterministic tiers.

## The SFT generation config

`sft/generation-config.json` holds the model shape (layers, heads, hidden size), the sampling options and, under `promptTemplate`, the prompt texts of prompt contract 1: the system prompt, the example row and the ChatML turn markers. `parseSftConfiguration` and `parseSftPromptTemplate` (in `src/model/learned-runtime.ts` and `src/model/sft-runtime.ts`) parse it strictly; unknown keys, empty texts and non-scalar example values are rejected. The user-prompt skeleton around these texts is rendering code in `renderRowPrompt`.

Changing any of these texts changes the file's digest, so it changes the row-generator fingerprint and the manifest revision. The model answer cache is namespaced by the manifest revision and keyed by the model fingerprint and the rendered prompt, so cached answers of an earlier bundle are not reused.

## Rebuilding and checking the manifest

Run from `packages/mock-data-generator`:

| Command                                                                               | Effect                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `node scripts/build-model-manifest.mjs`                                               | Rewrites `resources/models/manifest.json` from the files on disk                                                                                                   |
| `node scripts/build-model-manifest.mjs --check`                                       | Prints `{ upToDate, revision }`; exits with 1 when the manifest is stale                                                                                           |
| `node scripts/build-model-manifest.mjs --review-status approved --review-record FILE` | Rebuilds and records an approval, pinned to the SHA-256 of the review record                                                                                       |
| `pnpm check:package`                                                                  | Packs the package and verifies the packed manifest, models, datasets and identity                                                                                  |
| `pnpm check:release`                                                                  | Additionally requires qualified heads, a content-derived manifest, approved provenance and passing realism sweep reports of this build (`MOCKGEN_REALISM_REPORTS`) |

The script treats the existing manifest as a template. Edit `bundleId` and each component's `version` by hand for a new release; everything else is derived: file sizes and digests, component fingerprints, the classifier contract (from `classifier/head.json`, which must use input format `v3` and match the packaged encoder and vocabulary digests), the optional relevance and concept heads, the dataset entries and the revision. Every concept of the concept head must have its bank in the value-bank store. An approved provenance is kept while the revision is unchanged and withdrawn when the content changes.

## Relocating the resources (`resourceRoot`)

`createMockDataGenerator({ resourceRoot })` and `getMockDataGeneratorInfo({ resourceRoot })` accept an absolute directory that holds `models/`, `banks/` and `rules/`, laid out like the package's own `resources/` directory. A host that copies the resources elsewhere points there. The manifest and the model files are read from it, and its data files are verified against the manifest digests.

The value-bank store, rule store and role registry are read on first use, never when the package's modules load, from the root of the first session; without a session they come from the package's own `resources/` directory. A host that bundles the package copies the whole `resources/` directory next to its bundle and passes that directory as `resourceRoot`. Before the first parse, every dataset file below the root is verified against the manifest digests. A process uses one set of these three resources: a later session on another root is accepted only when that root's verified manifest declares the same digests, and is rejected with `CONFIGURATION_INVALID` otherwise. In a CommonJS bundle the package cannot locate its own directory, so a session without `resourceRoot` fails with `CONFIGURATION_INVALID` and a message that says to pass it.
