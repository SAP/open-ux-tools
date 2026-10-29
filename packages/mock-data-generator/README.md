# `@sap-ux/mock-data-generator`

Generate OData mock data offline from EDMX or CSN metadata. The package includes a semantic classifier, a local language model, and synthetic value banks.

## Usage

```ts
import { createMockDataGenerator, generateProjectData } from '@sap-ux/mock-data-generator';

const generator = await createMockDataGenerator();
try {
    const result = await generator.generateService(request, {
        mode: 'auto',
        rowsPerEntity: 10,
        seed: 1
    });
    // result.resources contains rows keyed by entity set.
} finally {
    await generator.dispose();
}

await generateProjectData({
    projectRoot: '/absolute/application/path',
    dataDirectory: 'webapp/localService/mockdata',
    request,
    options: { rowsPerEntity: 10, seed: 1 }
});
```

`request` contains metadata, service identity, target resources, authored rows, and an optional cancellation signal. Generation modes are `auto`, `learned`, and `deterministic`. `generateService()` and `inspectService()` also have one-shot exports that dispose their session automatically. `getMockDataGeneratorInfo()` returns the public API version (`apiVersion: 2`, which hosts pin), package/model identity and the required native runtime, without allocating it.

Sessions accept `onProgress`, an optional absolute `answerCacheDirectory`, an optional absolute `resourceRoot`, and an execution mode. Execution modes are budget presets named after the host's purpose and kept for compatibility: `api` (default) and `start-mock` apply no preset, and `data-editor` bounds the language model for an interactive editor with the `DATA_EDITOR_SFT_*` limits of `src/limits.ts`. Explicit generation options always win over a preset; the preset table itself is not exported.

`resourceRoot` is for hosts that bundle the package (for example with esbuild, as an ES module or CommonJS bundle) and copy its whole `resources/` directory elsewhere. Everything is read from that directory: the model manifest, the model artifacts, the value banks, the semantic rules and the role registry. Every data file is verified against the manifest's SHA-256 digests before it is parsed. Importing the package reads no resource file, so a bundle loads even where the package cannot locate its own `resources/` directory; a CommonJS bundle must pass `resourceRoot`. A process uses one set of value banks, rules and registry: the first session fixes the root they are read from, and a later session on another root is accepted only when that root holds byte-identical files (otherwise `CONFIGURATION_INVALID`). `getMockDataGeneratorInfo({ resourceRoot })` and `generateProjectData({ ..., resourceRoot })` accept the same option.

The CLI supports `mockgen help`, `mockgen info` and `mockgen generate --input <request.json>`, where the input has the `generateProjectData()` shape. The command result is one JSON document on standard output; usage and error messages go through `@sap-ux/logger`. The CLI validates the request document before generating and names the JSON path of the first invalid value; a cancellation signal cannot be supplied in JSON.

## Errors and diagnostics

Failures a caller can act on throw `MockGenError` with a stable `code` from `MOCKGEN_ERROR_CODE` (exported with the `MockGenErrorCode` type): for example `REQUEST_INVALID` (request document, request or generation option), `METADATA_INVALID`, `CONFIGURATION_INVALID` (session options such as a relative `resourceRoot`), `CLI_USAGE`, `FILE_UNREADABLE`, `RESOURCE_INTEGRITY` (a shipped resource or model is missing, corrupt or does not match the manifest), `PROJECT_PATH_UNSAFE`, `PROJECT_LOCKED`, `PROJECT_DATA_CHANGED` and `PROJECT_RECOVERY_REQUIRED`. The underlying error is kept as `cause`. Messages for people (CLI usage, request validation, lock and recovery, integrity failures) are translatable and come from `src/translations/mock-data-generator.i18n.json` through i18next; match on `code`, not on message text. `TypeError` remains only for internal contract violations, as documented in `src/errors.ts`.

Generation diagnostics are not errors: `MockDataGeneratorDiagnostic.code` is the string-literal union `MockDataGeneratorDiagnosticCode`, and diagnostic messages are English technical text.

Metadata `format` is `edmx` or `csn`. When a CSN document defines services, only one service is read and its entity sets carry CAP's OData names (`CatalogService.Books.texts` becomes `Books_texts`). The service is chosen by `service.alias` (qualified or short service name), otherwise by matching `service.urlPath` against the service's `@path` or CAP's default path, otherwise it must be the only service.

## Generation and validation

Authored data, enumerations, value helps, and explicit relationships take precedence over synthetic samples. Deterministic dates fall in a calendar window set by `referenceDate` (`YYYY-MM-DD`, default `2020-01-01`) and `windowYears` (1 to 100, default 6). The classifier routes supported fields to deterministic providers; the language model proposes unresolved values, and validated deterministic values provide fallback. Classifier and model failures are isolated. Generated code/text domains require an independent candidate verifier before model proposals are accepted.

Results report execution mode, component readiness, diagnostics, routing, value tiers, the cells nothing could give a meaningful value, which keep the standard mock server value (property name and row index) or stay empty where the column is too short (`abstentions`), whether the generated rows pass the hard realism checks (`realism`: no placeholder, no leaked name, one text per code, no start after its end), semantic coverage, validation, and fingerprints. Format-valid synthetic data does not establish business validity. `validation.relationships` is false when caller-supplied rows reference rows that do not exist; generated references always resolve. Inspection includes generated values only when explicitly requested, and progress events exclude prompts and row values. Unsupported schema elements are omitted with diagnostics.

`generateProjectData()` stages and validates JSON before replacing the target directory, preserves unrelated files, and restores originals on commit failure. Concurrent runs on the same project take turns through a lock directory (`.mockgen-project.lock`) next to the data directory; a lock left by an ended process on the same host is removed automatically. It rejects traversal, symlinks, and special files. It does not edit application scripts or UI5 configuration.

## Resources and packaging

All role and concept value banks live in `resources/banks/value-banks.v2.json`, and the semantic rules (lexical rules, ABAP data elements, temporal and coherence vocabulary, model output filters, routing policy and thresholds) in `resources/rules/semantic-rules.v1.json`, documented by `semantic-rules.schema.json`. The role registry is `resources/rules/role-registry.v1.json`. Value and rule order affect seeded output. `sampleDataset` can replace descriptive samples; `syntheticScenario` supplies explicit domains and coherence rules. After changing resources, regenerate the manifest with `node scripts/build-model-manifest.mjs` from the package directory. An approved provenance is kept while the manifest revision is unchanged and is withdrawn when the content changes.

The model manifest, the SFT generation config (including the prompt texts of the model contract), the tokenizer, the vocabulary and the classifier heads are tracked with the package; the two ONNX binaries are supplied separately for inclusion in the npm tarball, as described in [model supply](docs/model-supply.md). The models are English-only. The package verifies the digests of the value banks, semantic rules and role registry and the pinned `onnxruntime-node` version when a session is created, and the model artifacts' sizes and SHA-256 hashes before it first loads models (once per process; never in deterministic mode). A model component that fails to load is reported as a warning diagnostic with its cause, and generation continues on the deterministic tiers. Run `pnpm check:package` to verify the packed artifact; `pnpm check:release` additionally checks model qualification, relevance verification, approved provenance, and that `MOCKGEN_REALISM_REPORTS` lists a passing realism sweep report of this exact build for each release profile (no hard-check finding, nothing worse than the baseline release). See [model licenses and provenance](docs/model-licenses.md) for redistribution requirements, and the [data and heuristics design record](docs/design/data-and-heuristics.md) for where each kind of data lives, the specification citations of the remaining in-code constants, the documented limits of each heuristic, the determinism guarantees and the integrity chain.
