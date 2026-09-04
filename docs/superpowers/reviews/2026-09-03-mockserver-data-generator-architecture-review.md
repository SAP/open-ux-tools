# Mockserver data generator architecture implementation record

**Status:** Implemented on isolated feature branches; normal pull-request review pending

**Repositories:** `SAP/open-ux-odata` and `SAP/open-ux-tools`

**Public packages:** `@sap-ux/mockserver-data-generator` and the optional
`@sap-ux/mockserver-data-generator-cap`

## Fixed objective

Reimplement the successful MockGen pilot as production Open UX code. Generated
rows must look realistic for SAP applications while remaining structurally
valid, deterministic for a fixed seed, relationally coherent, and safe to fall
back when a learned component is unavailable.

The implementation retains the pilot's two learned components:

- the calibrated MiniLM embedding classifier; and
- the fine-tuned SmolLM SFT row generator.

The pilot repository is a read-only source of behavior, model artifacts,
datasets, and evaluation evidence. Production code does not depend on any
`@mockgen/*` package.

## User-visible contract

A Fiori application keeps one `sap-fe-mockserver` middleware, one
`ui5-mock.yaml`, and its existing `start-mock` command:

```yaml
- name: sap-fe-mockserver
  beforeMiddleware: csp
  configuration:
    generateMockData: true
    mockDataGenerator:
      name: "@sap-ux/mockserver-data-generator/fe-mockserver"
      timeoutMs: 60000
      options:
        rowsPerEntity: 10
        seed: 42
        locale: en
        mode: auto
```

The setting is opt-in. Existing mock JS, TS, and JSON data keeps precedence.
If the package, classifier, SFT runtime, model cache, or generated output fails,
the host continues through the deterministic or existing mockserver fallback.

## Repository boundary

### `SAP/open-ux-odata`

The standard FE mockserver owns a generic, versioned `mockDataGenerator` SPI:

- one asynchronous whole-service generation call per eligible load/reload;
- JSON-compatible context and results, a narrow logger, and `AbortSignal`;
- package-export loading with `apiVersion: 1` validation;
- authored-data precedence and bounded result validation;
- a maximum 60-second host deadline; and
- provider disposal with no dependency on MockGen or ML libraries.

The provider setting can be global, overridden per service, or disabled for a
service with `mockDataGenerator: false`. Provider absence is behavior-neutral.

### `SAP/open-ux-tools`

`@sap-ux/mockserver-data-generator` owns:

- EDMX and CSN parsing into one internal service graph;
- deterministic type, key, constraint, finite-domain, relationship, and
  semantic-coherence generation;
- the pilot-compatible classifier tokenizer, MiniLM ONNX inference, calibrated
  head, and high-precision abstention;
- the pilot-compatible SFT prompt, SmolLM tokenizer, constrained JSON grammar,
  causal ONNX inference, and deterministic wide-field chunking;
- independently degradable learned components and safe deterministic fallback;
- immutable external model manifests, downloads, hashes, and cache locking; and
- the CommonJS `/fe-mockserver` adapter required by the existing host loader.

The same repository also owns typed UI5 configuration, writer/create-CLI
opt-in, the local/BAS development kit, and a native CAP development adapter.

## Model and package boundary

The npm packages contain code only. Classifier and SFT weights remain external,
are selected through a versioned manifest, and are loaded only after byte-size
and SHA-256 verification. Importing or constructing the package performs no
network access and creates no model session.

The initial production candidate reuses the pilot's dynamic-int8 classifier
and SFT exports. The evaluation report records exact artifact hashes, structural
metrics, latency, memory, package footprint, the rejected int4 candidate, and
the native-versus-WASM no-go decision:

- `docs/quality/mockserver-data-generator-model-evaluation.md`

WASM is not an implementation target because the measured classifier backend
was materially slower and used more memory even though its installed runtime
was smaller.

## Native CAP integration

`@sap-ux/mockserver-data-generator-cap` is a separate, opt-in development/test
plugin. It seeds only empty persistence entities after CAP's awaited `served`
lifecycle, preserves existing rows, inserts in foreign-key order inside one
transaction, and is always disabled in production. Installing the FE provider
alone has no CAP side effect.

## Development verification

The bundled development installer builds and packs the exact generator and
matching `open-ux-odata` host packages, installs them into an existing generated
Fiori application, edits only the standard mockserver configuration, runs
bounded metadata/entity HTTP canaries, and can transactionally restore the
application. V2 EDMX, V4 EDMX, and CDS-through-FE fixtures are covered. The
native CAP adapter has real SQLite seed/restart/foreign-key coverage on CAP 10
and a packed-consumer smoke on CAP 9.9.

## Remaining engineering gates

The following do not alter the architecture and are not unresolved sponsor
questions:

- ordinary maintainer review of both feature branches;
- fresh candidate-bound realism judging before claiming realism readiness;
- Linux/BAS and remaining supported-platform runtime canaries; and
- publication-time verification of npm tarballs and externally hosted model
  artifacts.

The complete host contract is mirrored in
`SAP/open-ux-odata/docs/mock-data-generator-provider.md` and
`SAP/open-ux-tools/packages/mockserver-data-generator/docs/host-contract.md`.
