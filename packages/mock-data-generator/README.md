# `@sap-ux/mock-data-generator`

Standalone, offline MockGen package for whole-service OData mock-data generation. The npm tarball includes the classifier encoder/head/vocabulary, the local LLM/tokenizer/configuration, versioned synthetic sample resources, and a pinned `onnxruntime-node` dependency. It has no mockserver provider, SPI, middleware, YAML option, model downloader, or external model cache.

The initial consumer is Data Editor. A later application integration may run `generateProjectData()` before the application's existing standard mockserver starts; this package does not currently alter `npm run start-mock`.

## API

```ts
import { createMockDataGenerator, generateProjectData, getMockDataGeneratorInfo } from '@sap-ux/mock-data-generator';

const info = getMockDataGeneratorInfo(); // package and model identity, no native allocation
const generator = await createMockDataGenerator({ executionMode: 'api' });
try {
    const result = await generator.generateService(request, {
        mode: 'auto',
        rowsPerEntity: 10,
        seed: 1
    });
    // result.resources, diagnostics, capabilities, executionMode, validation and fingerprints
} finally {
    await generator.dispose();
}

await generateProjectData({
    projectRoot: '/absolute/application/path',
    dataDirectory: 'webapp/localService/mockdata',
    request,
    options: { mode: 'auto', rowsPerEntity: 10, seed: 1 }
});
```

`request` includes actual EDMX or CSN metadata, service URI/protocol, target resources, application-authored evidence, and optional cancellation signal. `inspectService()` is available on the session; generated values appear in an inspection report only when explicitly requested. The CLI provides `mockgen info` and `mockgen generate --input <request.json>`; the JSON input has the `generateProjectData()` shape.

`mode` is `auto`, `learned`, or `deterministic`. The semantic planner is the only pipeline through the standalone API. Classifier and LLM loading/inference fail independently. Safe unconstrained slots may retain validated deterministic values. An evidence-poor linked code/text domain requires a qualified independent candidate verifier; without one, or after bounded candidate rejection, generation fails before project files are replaced. This is intentional release-gating behavior, not a standard-mockserver fallback.

## Evidence, samples, and validation

Application-authored data, enumerations, value helps, and explicit relationships take precedence. Synthetic names and descriptions come from replaceable, versioned value banks; they are examples, not application facts or a realism oracle. Business scenarios must be passed explicitly in `syntheticScenario`; application names and countries do not select one. Format and relationship validation uses schema constraints and actual generated values, not membership in a bundled sample list. Unsupported semantics remain visible in diagnostics and inspection coverage.

### Value banks

Every value bank the generator draws from lives in one store, [`resources/banks/value-banks.v1.json`](resources/banks/value-banks.v1.json). Each bank is keyed by its label `<kind>:<id>` and declares its `kind`, `id` and `valueKind`:

- `role` banks feed the semantic role providers: names, organizations, descriptions, locations, currencies, units, statuses, products and the other descriptive samples. A bank that serves one role, such as `role:language` or `role:bic`, is named after the role.
- `concept` banks hold the values of the classifier's concept head, one per concept id (`concept:<id>`), with the concept's `name` and the primitive `types` it was observed with. The concept head file carries only prototypes, thresholds and acceptance inputs; a concept without a bank stops the classifier from loading.

A bank holds `values` (strings, or integers for `integer` banks), code/text `pairs`, a numeric `range`, or structured `records` whose field types it declares in `fields`, so fields that belong together (a city with its region, postal code and phone prefix; a unit with its ISO code and text) are drawn together:

```json
{
    "format": "mockgen-value-banks",
    "version": 1,
    "banks": {
        "role:currencies": { "kind": "role", "id": "currencies", "valueKind": "code", "values": ["EUR", "USD"] },
        "role:units": {
            "kind": "role",
            "id": "units",
            "valueKind": "record",
            "fields": { "code": "string", "iso": "string", "text": "string" },
            "records": [{ "code": "KG", "iso": "KGM", "text": "Kilogram" }]
        },
        "concept:plant": {
            "kind": "concept",
            "id": "plant",
            "name": "plant",
            "valueKind": "code",
            "types": ["string"],
            "values": ["1000", "1010"]
        }
    }
}
```

The store is validated against this schema when the package loads: unknown keys, empty lists, records that do not match their fields and mislabelled banks are errors. Value order is behaviour, because generators pick a value by row hash, so reorder a bank only when a changed output is intended. The package manifest declares the store's SHA-256, the standalone API refuses a store whose loaded bytes differ from it, and the store's digest is part of every generation fingerprint. After editing the store, regenerate the manifest with `node scripts/build-model-manifest.mjs`. Hosts can replace the default names, organizations and descriptions for one run through the `sampleDataset` option.

Schema elements without a generatable inline JSON value never abort the whole service. Generated rows omit a property of type `Edm.Stream`, a geospatial type, `Edm.Duration`, or an undeclared type, as they omit complex and collection properties, and report it with `SCHEMA_PROPERTY_OMITTED`. The SAP Fiori tools mock server serves such rows unchanged, and OData V4 represents a stream through media links rather than an inline value. An enumeration-typed property is generated from its member names. An entity set whose entity type is not declared in the metadata document, or whose key has one of those types, is left out of `resources` and reported with a `SCHEMA_ENTITY_SET_SKIPPED` warning; the other requested entity sets are still generated.

`getMockDataGeneratorInfo().apiVersion` is `2` in the development branch. Inspection exposes `classifierPrediction` before arbitration alongside `detectedRole` and `acceptedRole`, so an unsupported prediction is not misreported as a model failure or a validated provider. Routing counts separate metadata, classifier, lexical and abstained decisions from provider binding. SFT statistics distinguish eligible and accepted value slots, rejected candidate slots across attempts, and final fallback slots. `validation.formats` and `validation.relationships` describe executed checks; `validation.domainMeaning` is separately `evidence-verified`, `synthetic-unverified`, `unsupported`, or `not-applicable`. Coverage reports evidence-verified and synthetic-unverified fields separately. Synthetic model text is never promoted to evidence-verified solely because it passes format and relationship checks.

`realismReady: true` is the requested package-level capability declaration. It is **not** a statement that every field or run is realistic. Check each run's `executionMode`, classifier/SFT readiness, routing, SFT slots, coverage, validation and model/request fingerprints before using the files. Model qualification, sealed unseen-service evaluation, human realism review, and platform approval remain release-governance gates. The next package and VSIX are held until those gates pass; the reviewed relevance model is not yet bundled.

## Packaging and publication

`resources/models/manifest.json` records exact file sizes, SHA-256 hashes, runtime version, contracts, provenance and licenses. All model files and the value-bank store are checked before native allocation; `check:package` also verifies the packed tarball. The temporary `@unseen/mock-data-generator` identity is produced only in a separate staging directory by `stage:development`; source keeps the canonical SAP scope. Public publication remains blocked until redistribution and release approval are recorded. See [model provenance](docs/model-licenses.md) and [security](docs/security.md).
