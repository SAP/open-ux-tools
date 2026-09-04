# `@sap-ux/mockserver-data-generator`

Generates context-aware, structurally valid mock data for SAP Fiori applications from OData metadata. The package is an opt-in data provider for the standard `@sap-ux/ui5-middleware-fe-mockserver`; it does not add a second middleware or start command.

## Status

This package is under development for an initial preview. The production design uses one whole-service generation pass with four ordered tiers:

1. values declared by metadata and reference catalogs;
2. calibrated semantic classification, governed value banks, and coherence groups;
3. an optional local fine-tuned model for unresolved fields;
4. deterministic, type-correct fallback.

The classifier and fine-tuned generator are independently replaceable runtimes. Their large model artifacts are acquired into a checksum-verified local cache and are not published in the npm package. Any unavailable or failed learned tier degrades to usable deterministic data.

Learned mode also requires the optional `onnxruntime-node` peer. Each model
manifest pins an exact runtime version, which must match the installed runtime;
the initial preview supports the `1.24.x` line.

## FE mockserver integration

The standard mockserver loads the CommonJS provider export:

```yaml
server:
  customMiddleware:
    - name: sap-fe-mockserver
      configuration:
        mockDataGenerator:
          name: '@sap-ux/mockserver-data-generator/fe-mockserver'
          options:
            seed: 42
            rowsPerEntity: 10
            sftTimeoutMs: 30000
```

Per-service settings can override the global setting, and `mockDataGenerator: false` opts one service out. Developer-authored JavaScript, TypeScript, or JSON mock data always wins.

`sftTimeoutMs` bounds each entity-level fine-tuned inference (default: 30 seconds, maximum: 60 seconds). After the first SFT runtime failure in a service generation, remaining entities use deterministic fallback without retrying that failed tier.

## Programmatic API

```ts
import { generateService } from '@sap-ux/mockserver-data-generator';

const result = await generateService(
    {
        metadata: { format: 'edmx', content: edmx },
        service: { urlPath: '/sap/opu/odata/example', odataVersion: '4.0' },
        targets: [{ name: 'Products', kind: 'entity-set' }],
        existingData: {}
    },
    { seed: 42, rowsPerEntity: 10, sftTimeoutMs: 30_000 }
);
```

See [the architecture design](../../docs/superpowers/specs/2026-09-03-mockserver-data-generator-design.md) and [host contract](./docs/host-contract.md) for the complete lifecycle, precedence, model, and degradation rules.

## Test current source in a Fiori application

The packages are unpublished during development. Use the
[local/BAS development kit](../../scripts/mockserver-data-generator-dev-kit/README.md)
to pack the current generator and matching FE mockserver host, install them
transactionally into an existing generated application, run an HTTP canary, and
restore the application afterward. Do not use a registry npx command for this
source state.

## Model evaluation

The [model evaluation harness](../../scripts/mockserver-data-generator-evaluation/README.md)
reuses the pilot classifier/SFT cohorts and artifacts through explicit local
paths, fingerprints every input, compares quantization candidates in isolated
processes, and emits no generated values into this repository. Current
development measurements and the INT4/WASM decisions are recorded in the
[model evaluation report](../../docs/quality/mockserver-data-generator-model-evaluation.md).
