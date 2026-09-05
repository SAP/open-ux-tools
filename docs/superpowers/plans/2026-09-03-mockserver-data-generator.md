# Mockserver Data Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reimplement the experimental MockGen integration pilot as an enterprise-grade, opt-in data generator for the standard SAP Fiori mockserver, while reusing and governing the existing classifier/SFT assets and keeping model weights outside npm.

**Architecture:** Add a generic, service-scoped `mockDataGenerator` SPI to `SAP/open-ux-odata`; implement `@sap-ux/mockserver-data-generator` and its `/fe-mockserver` provider in `SAP/open-ux-tools`; distribute immutable models separately; preserve existing mock files; and degrade to the standard generator without blocking the app.

**Tech Stack:** TypeScript 5.9, ESM/NodeNext with a conditional CommonJS provider export, Node 22/24, pnpm 11, Nx, Jest, UI5 Tooling, `@sap-ux/fe-mockserver-core`, ONNX Runtime native or Web/WASM selected by benchmark, Python training/export tooling, JSONL datasets, SHA-256 manifests, and Hugging Face or an approved SAP artifact mirror.

---

## Fixed decisions and evidence

- The public production name is `@sap-ux/mockserver-data-generator`; `MockGen` remains the pilot name only.
- Applications keep one `sap-fe-mockserver` middleware, one `ui5-mock.yaml`, and one `start-mock` script.
- Existing JS/TS contributor-owned rows and JSON mock data win over generated data. Hook-only contributors remain active around later row sources. No user mock file is overwritten.
- Generation is one asynchronous whole-service operation during service initialization, never an LLM call on an HTTP request path.
- OData V2, OData V4, and CAP-through-the-CDS-metadata-processor are in the first FE integration. Native CAP and OpenAPI are deferred.
- The default language is English for the first preview; locale remains part of the public contract and cache key.
- The npm package contains no model weights, checkpoints, training data, provider outputs, or Python environment.
- The pilot's classifier corpus, SFT corpus, model artifacts, and judge harnesses are inputs to this work. They are not discarded or recollected wholesale.
- A label is eligible for production supervision only when its provenance, review method, and authorization are verified; unresolved records remain quarantined.
- Dataset reuse requires fingerprinted lineage, normalized duplicate-group isolation, and service/application-family-disjoint training, calibration, and evaluation splits.
- Once governance and reproduction pass, the dynamic-int8 generator candidate defines the exact-byte size/quality baseline. Lower-precision candidates require documented calibration and the full promotion gates.
- Existing LLM judge reports are historical baselines. Promotion requires a fresh report bound to the exact candidate fingerprint.
- WASM is a bounded runtime experiment. It proceeds to product code only if it meets the explicit footprint, latency, memory, and correctness gates in Phase 9.
- Manual development testing uses freshly built npm tarballs and the existing Fiori application's `start-mock` flow. Global links, copied `node_modules`, and paths back to a developer checkout are not release-gating evidence.
- The finance sample application bug is outside this plan.

## Repository and branch map

| Workstream | Repository and branch | Primary outputs |
| --- | --- | --- |
| Generator and tooling | `SAP/open-ux-tools`, `feat/mockserver-data-generator`, based on `origin/main` `6879d47df9097421fd98edf0800eb13c2c513aa9` | New package, evaluation, and local/BAS development kit |
| Mockserver host SPI | `SAP/open-ux-odata`, `feat/mock-data-generator-spi`, based on `origin/main` `d94d8d3c31bb770e267784e0011aee5fb7e361a6` | Generic SPI and lifecycle integration |
| Model/data lifecycle | Existing pilot workspace for local implementation; approved managed storage before redistribution | Governed datasets, training, exports, evaluation, immutable candidates |
| Pilot comparison | Local `sap-ai-mockserver` pilot repository | Read-only parity and evidence source; local locator remains outside public documentation |

Every implementation commit is conventional, signed off for DCO, scoped to one concern, and accompanied by the required changeset. Generated `dist`, model files, caches, and evaluation outputs are never committed to `open-ux-tools`.

## Dependency order

| Phase | Depends on | Can run in parallel with |
| --- | --- | --- |
| 0. Program setup and contracts | None | None |
| 1. Pilot evidence preservation | Existing pilot workspace; managed storage is required only before copying or publishing artifacts | Phases 2 and 3 |
| 2. Mockserver host SPI | Phase 0 contract draft | Phases 1, 3, and 4 |
| 3. Production package scaffold | Phase 0 contract draft | Phases 1 and 2 |
| 4. Deterministic engine | Phase 3 | Phases 1 and 2 |
| 5. FE mockserver provider integration | Phases 2 and 4 | Phase 8 |
| 6. Shared-package scope guard | Phase 5 provider | Phases 7–9 |
| 6A. Local and BAS developer test kit | Phases 2, 3, and 5 | Phases 7–9 |
| 7. Model acquisition and runtime | Phase 3 model contract; redistribution clearance before publishing a model | Phases 6 and 8 |
| 8. Dataset repair and model training | Phase 1 inventory; source clearance before moving data to a public or shared repository | Phases 5–7 |
| 9. Footprint and quantization campaign | Phases 7 and 8 baseline reproduction | Phase 10 |
| 10. Production evaluation | Phases 5, 8, and 9 | Phase 12 where possible |
| 11. Native CAP boundary | Explicitly deferred | None |
| 12. Product hardening | Phases 5–7 | Phase 10 where possible |
| 13. Preview, promotion, and pilot retirement | Phases 10 and 12 | None |

## Phase 0 — Establish clean execution and freeze the contracts

**Outcome:** Both repositories have isolated branches and the fixed two-repository contract is implemented. Standard maintainer review remains part of merging the branches.

### Task 0.1: Establish the current `open-ux-tools` worktree and toolchain

**Files:**

- Existing: root `package.json`
- Existing: root `AGENTS.md`
- Track: `docs/superpowers/specs/2026-09-03-mockserver-data-generator-design.md`

- [x] Fetch `origin/main` and record the source SHA `6879d47df9097421fd98edf0800eb13c2c513aa9`.
- [x] Create an isolated worktree on `feat/mockserver-data-generator`.
- [x] Run `fnm exec --using=22.22.3 -- corepack pnpm --version` and require `11.22.0`.
- [x] Run `pnpm install --frozen-lockfile` with Node 22.22.3 and record any existing upstream warnings separately from feature failures.
- [x] Confirm `git status --short` contains no generated or ignored pilot output in the new worktree.

**Recorded baseline (2026-09-03):** Node `v22.22.3`, pnpm `11.22.0`, frozen install exit `0` with all 97 workspace projects already up to date. A filtered `git ls-files --others --ignored --exclude-standard` check, excluding dependency directories, found no pilot/model/cache paths or learned-artifact extensions. The only tracked changes were the planned documentation additions.

**Verification:**

```bash
git rev-parse HEAD
node --version
pnpm --version
git status --short
```

### Task 0.2: Establish the `open-ux-odata` host branch

**Files:**

- Main checkout: local `SAP/open-ux-odata` checkout
- Feature worktree: isolated `feat/mock-data-generator-spi` worktree
- Record the starting SHA in the cross-repository contract fixture.

- [x] Fetch `SAP/open-ux-odata` without reusing the temporary research clones; record refreshed `origin/main` as `d94d8d3c31bb770e267784e0011aee5fb7e361a6`.
- [x] Read its current contributor guidance and toolchain requirements.
- [x] Create a linked worktree on `feat/mock-data-generator-spi` from refreshed `origin/main`.
- [x] Run the unmodified core and middleware suites as the host baseline.

**Recorded baseline (2026-09-03):** SHA `d94d8d3c31bb770e267784e0011aee5fb7e361a6`, Node `v22.22.3`, pnpm `11.9.0`. Frozen install and the unmodified root build exited `0`. The fresh-worktree install warned that the admin CLI bin target did not exist before build; this is upstream build ordering, and the warning disappeared as a blocker after the normal root build. After that prerequisite, `@sap-ux/fe-mockserver-core` passed 26 suites/334 tests and `@sap-ux/ui5-middleware-fe-mockserver` passed 2 suites/10 tests. Existing CDS compiler warnings and two Jest open-handle diagnostics in the core suite are recorded as upstream baseline output, not feature regressions.

**Verification:**

```bash
pnpm install --frozen-lockfile
pnpm --filter @sap-ux/fe-mockserver-core test
pnpm --filter @sap-ux/ui5-middleware-fe-mockserver test
```

### Task 0.3: Implement and document the two-repository architecture

**Files:**

- Create: `packages/mockserver-data-generator/docs/host-contract.md`
- Create in host repository: `docs/mock-data-generator-provider.md`
- Create: `docs/superpowers/reviews/2026-09-03-mockserver-data-generator-architecture-review.md`

- [x] Document why `@sap-ux/fe-mockserver-plugin-cds` is a metadata processor, not a row-generation hook.
- [x] Implement the `mockDataGenerator` field, global and per-service override rules, and provider lifecycle.
- [x] Implement `@sap-ux/mockserver-data-generator` and its `/fe-mockserver` subpath export.
- [x] Preserve precedence: TS-before-JS contributor rows, JSON file, provider rows, built-in generator, empty data, while preserving hook-only contributors around later sources.
- [x] Implement one provider invocation per service, cancellation, watch reload, disposal, and failure degradation.
- [x] Support Node 22 and the CommonJS entry required by the current host loader.
- [x] Add the adjacent `@SAP/ux-tools-app-generators-and-deploy` CODEOWNER for both new packages.

**Implementation record (2026-09-04):** The mirrored contracts and feature branches implement the configuration, explicit per-service disable, source precedence, cancellation, reload, failure degradation, CommonJS loading, and cross-repository boundary. No alternate custom-middleware architecture or additional manager decision is pending. The branches still require ordinary repository pull-request review before merge.

### Task 0.4: Define measurable promotion budgets

**Files:**

- Record current candidate evidence in `docs/quality/mockserver-data-generator-model-evaluation.md`.
- Run the same fingerprinted harness on each release platform before publication.

- [ ] Define npm packed bytes, dependency installed bytes, model download bytes, cache bytes, load time, peak RSS, cold generation, and warm-cache startup as separate metrics.
- [ ] Set the npm packed ceiling to 5 MiB and prohibit model/checkpoint extensions.
- [ ] Set both preview wire-transfer and verified-model-cache ceilings to 200 MiB, derive the generator-weight optimization target as `floor(approvedBaselineBytes / 2)`, and set the total incremental installed/cache ceiling to 300 MiB.
- [ ] Set a 32 MiB generated-data-cache quota with deterministic LRU eviction and include the quota, not benchmark history, in the total-footprint gate.
- [ ] Set provider/module-load p95 to at most 250 ms, model-session-load p95 to at most 5 seconds, and cold whole-service generation p95 to at most 25 seconds on the reference platform.
- [ ] Set warm generated-data cache overhead to at most 200 ms on the reference machine without loading a model session.
- [ ] Keep T2 inside the 20-second session budget.
- [ ] Bound automatic first-use acquisition to 30 seconds before fallback and provide an explicit preparation command for slow/offline environments.
- [ ] Set the end-to-end host provider deadline to 60 seconds, covering acquisition, inference, result validation, and publication.
- [ ] Record structural, classifier, output-quality, realism, privacy, and compatibility gates from Phases 8–10.
- [ ] Freeze T2 parse/fill denominators, predeclared `expectedEmpty` resources, metadata-derived relationship assertions, and domain-coherence assertions before candidate execution; require 100% of every absolute structural and coherence assertion.
- [ ] Record the fixed sampling, percentile, timeout-censoring, consumer-install, filesystem, process-tree memory, and native-versus-WASM accounting protocols.

**Exit gate:** Every release measurement names its harness, input and artifact fingerprints, machine/runtime details, threshold, and failure disposition. These are repeatable engineering checks, not sponsor decisions.

## Phase 1 — Preserve and govern the pilot evidence

**Outcome:** The existing work becomes durable, traceable input to the production effort instead of remaining in ignored laptop directories.

Tasks 1.1–1.3 inspect the existing pilot artifacts in place and preserve the evidence already produced. Local repair, training, inference, and evaluation may proceed in that workspace. Source payloads and model weights are not copied into a public repository, published, or promoted until their provenance and redistribution status are cleared; Task 1.4 performs that controlled migration.

### Task 1.1: Build an authoritative artifact inventory

**Files in the existing private pilot workspace; materialize in managed storage only after artifact release review:**

- Create: `manifests/pilot-artifacts-v1.json`
- Create: `manifests/pilot-environment-v1.json`
- Create: `README.md`

- [ ] Inventory classifier train pool, calibration split, adjudication set, legacy reviews, governed review outputs, and adjudication reports.
- [ ] Inventory SFT raw inputs, prepared JSONL, split manifests, LoRA checkpoints, merged weights, FP32, int8, and lower-precision exports, tokenizer, and config.
- [ ] Inventory judge prompts, schemas, provider outputs, compiled reports, historical baselines, and the newer inspection cohort.
- [ ] Record SHA-256, byte size, role (`authoritative`, `supporting`, `rejected`, or `cache`), source commit, command, seed, dependency lock, and machine metadata.
- [ ] Keep this pass read-only: do not copy or change a payload while Task 1.2 classifies its source and Task 1.3 specifies any required evidence-label correction.

**Initial local intake (2026-09-03):** A read-only audit confirmed candidate classifier, calibration, SFT, exported-model, quantization, and judge evidence that must pass the formal governance checks in this phase before reuse. Exact counts, paths, hashes, intake findings, model measurements, and evaluation results remain in the private intake record until disclosure classification. No artifact was copied and no training or paid-provider evaluation was rerun.

**Exit gate:** Every known artifact is represented in the private inventory with its local fingerprint, role, and classification state; no payload has moved before clearance.

### Task 1.2: Complete data, privacy, and redistribution classification

**Files in the existing private pilot workspace; materialize in managed storage only after artifact release review:**

- Create: `governance/source-register.jsonl`
- Create: `governance/data-card.md`
- Create: `governance/privacy-scan-report.json`
- Create: `governance/weight-distribution-decision.md`

- [ ] Record owner, provenance, license/internal authorization, allowed purpose, derivative-training permission, redistribution permission, privacy class, and retention for every source.
- [ ] Run secrets, PII, customer-data, memorization-risk, and unsafe-content scans after all cleaning transforms.
- [ ] Resolve every source with pending or contradictory privacy, derivative-use, or redistribution evidence before using it for a promoted training run or distributable artifact.
- [ ] Separate public, internal-training-only, evaluation-only, and prohibited artifacts.
- [ ] Decide whether weights derived from restricted internal examples may be distributed publicly.
- [ ] If public distribution is not cleared, keep the preview internal without weakening any other gate.

**Exit gate:** No training row has unknown authorization; no unresolved secret/customer-data finding exists; every distributable weight has an approved derivation chain.

### Task 1.3: Specify evidence-label corrections without mutating the corpus

**Files in the existing private pilot workspace; materialize in managed storage only after artifact release review:**

- Create: `governance/evidence-label-correction-plan.md`

- [ ] For any record identified by the checks, use an opaque inventory identifier to record the required transformation without copying record payloads into the plan.
- [ ] Specify that direct dual-provider agreements remain unchanged.
- [ ] Define a provenance vocabulary that distinguishes provider consensus, automated adjudication, and expert adjudication; require quarantine whenever a record's actual method is not documented and authorized.
- [ ] Identify records for which the approved provenance checks require a targeted expert decision before promotion.
- [ ] Specify that any unresolved review marker remains excluded from supervised training and retained in a quarantine pool for later governed review.
- [ ] Keep the source corpus, derived datasets, weights, and legacy reports byte-identical throughout this task.

**Exit gate:** Every proposed mutation is mapped to a classified source and permitted purpose, the original evidence remains byte-identical, and the correction plan is sufficient for the responsible owners to accept or reject artifact promotion.

### Task 1.4: Correct and migrate only cleared artifacts

**Files in the approved internal model repository and artifact store:**

- Create: `datasets/classifier/adjudication-set-v2.jsonl`
- Create: `datasets/classifier/adjudication-set-v2-manifest.json`
- Update: `manifests/pilot-artifacts-v1.json`
- Update: `manifests/pilot-environment-v1.json`

- [ ] Apply the approved correction plan only to sources whose classification permits the correction, intended use, and destination; preserve verified direct dual-provider agreements unchanged.
- [ ] Attribute each approved record to its verified review method, obtain only authorized targeted expert decisions, and exclude every unresolved marker from supervised training.
- [ ] Keep unresolved records in a governed quarantine pool and preserve immutable fingerprints for the original and corrected evidence.
- [ ] Copy only artifacts whose source, purpose, retention, derivative-use, redistribution, and privacy classifications permit the destination and intended role.
- [ ] Record immutable managed URIs and destination hashes without publishing local source paths.
- [ ] Verify retrieval and hashes from a clean machine or clean temporary directory.
- [ ] Leave rejected, prohibited, or unresolved payloads in quarantine and retain only permitted metadata about them.

**Phase exit gate:** Every report accurately attributes its review method, production training inputs contain no unresolved review markers, every artifact referenced by a production report exists at an approved managed URI and matches its recorded SHA-256, no prohibited or unresolved payload moved, and no laptop path is its only locator.

## Phase 2 — Add the generic mock-data-generator SPI to `open-ux-odata`

**Outcome:** The standard mockserver can load one asynchronous whole-service provider without knowing anything about ML.

### Task 2.1: Define the host API with failing type and lifecycle tests

**Files in `SAP/open-ux-odata`:**

- Modify: `packages/fe-mockserver-core/src/api.ts`
- Test: `packages/fe-mockserver-core/test/unit/mockDataGenerator.test.ts`

- [ ] Write compile-time fixtures for global configuration, per-service override, and explicit per-service `false` disable.
- [ ] Write a failing test that expects one provider invocation for one service with multiple entity sets.
- [ ] Write failing tests for bounded JSON options, the 60-second host deadline, API-version handshake, narrow logger, live abort signal, raw resolved metadata, entity-set/singleton targets, discriminated existing-row presence, and diagnostics.
- [ ] Prove data-bearing DTOs are defensively copied and frozen while the narrow logger wrapper and original live `AbortSignal` remain operational by reference.
- [ ] Add `MockDataGeneratorConfig`, `MockDataGenerationContext`, `MockDataGenerationResult`, and `IMockDataGenerator` without model-specific or host-internal types and without exposing absolute application paths.
- [ ] Export the contracts from the package root.

**Verification:**

```bash
pnpm --filter @sap-ux/fe-mockserver-core test -- mockDataGenerator.test.ts
```

### Task 2.2: Load and manage the provider lifecycle

**Files:**

- Modify: `packages/fe-mockserver-core/src/pluginsManager.ts`
- Modify: `packages/fe-mockserver-core/src/data/serviceRegistry.ts`
- Modify: `packages/fe-mockserver-core/src/index.ts`
- Test: `packages/fe-mockserver-core/test/unit/mockDataGenerator.test.ts`
- Fixture: `packages/fe-mockserver-core/test/unit/plugins/fake-data-generator.ts`

- [ ] Write failing tests for module load, service override/disable, one invocation per eligible generation epoch, bounded disposal, host-enforced end-to-end epoch timeout, cancellation, and every reload entry point; include a provider that resolves before the deadline whose result validation crosses it and must never publish.
- [ ] Add a loader separate from metadata processing and service-contribution plugins.
- [ ] Require a package export specifier in application configuration, permit absolute paths only in host tests, verify `apiVersion`, and require import/construction to be side-effect-free.
- [ ] Instantiate once per eligible service generation epoch and invoke before the initial service snapshot is opened; skip provider loading when no resource is eligible.
- [ ] Route file-watch reload, `POST /$metadata/reload`, and capture-and-simulate metadata arrival through one serialized coordinator with monotonic epochs and event coalescing.
- [ ] Serve the previous complete snapshot during reload, then atomically swap metadata, ETag, resolved sources, and provider rows without replacing the router.
- [ ] Cancel and boundedly dispose the previous provider during reload/disposal, suppress stale results, and attach rejection handling even when a timed-out provider ignores cancellation.
- [ ] Catch load/generation errors, emit a structured warning, and retain built-in generation when `generateMockData` is true.
- [ ] Add a contract test that loads the conditional CommonJS `/fe-mockserver` export from an ESM package.

**Exit gate:** Provider absence is behavior-neutral; provider failure does not prevent the service from opening; lifecycle tests pass without an ML dependency.

### Task 2.3: Insert generated rows into the existing precedence chain

**Files:**

- Modify: `packages/fe-mockserver-core/src/data/common.ts`
- Modify: `packages/fe-mockserver-core/src/data/dataAccess.ts`
- Modify: `packages/fe-mockserver-core/src/data/entitySets/entitySet.ts`
- Test: `packages/fe-mockserver-core/test/unit/mockDataGenerator.test.ts`
- Test: `packages/fe-mockserver-core/test/unit/data/entitySet.test.ts`

- [ ] Write failing tests for TS-before-JS contributor rows, hook-only contributors, JSON, intentionally empty JSON, provider rows, and built-in fallback precedence.
- [ ] Write a mixed-service test where static parent rows and generated child rows remain referentially valid.
- [ ] Write a V4 containment contract test where provider-owned root rows carry to-many arrays and to-one object/null values; direct child navigation and `$expand` work, while containment beneath authored parent rows remains byte-for-byte unchanged.
- [ ] Read contributor presence separately from initial-row ownership and safely resolvable existing entity-set/singleton data before the provider request.
- [ ] Store provider rows read-only on `DataAccess` and return defensive copies per context.
- [ ] Accept only bounded, acyclic, plain JSON-compatible rows; ignore unknown resource names with a bounded diagnostic, but reject the entire provider result when any supplied known resource is malformed.
- [ ] Preserve explicit source-presence state so authored/provider empty arrays cannot be confused with absent data.
- [ ] Ensure tenant-specific files still override every generated source.

**Exit gate:** Existing files remain byte-for-byte authoritative and all precedence, tenant, and relationship tests pass.

### Task 2.4: Propagate configuration through the UI5 middleware

**Files:**

- Modify: `packages/ui5-middleware-fe-mockserver/src/configResolver.ts`
- Test: `packages/ui5-middleware-fe-mockserver/test/configResolver.test.ts`
- Modify: relevant mockserver documentation and samples.
- Create: `.changeset/mock-data-generator-spi.md`

- [ ] Write failing global and per-service propagation tests.
- [ ] Preserve provider options without interpreting model-specific fields.
- [ ] Validate host-owned `timeoutMs` separately from opaque provider options and cap it at the frozen 60-second end-to-end epoch deadline, which remains active through result validation and atomic publication.
- [ ] Resolve only explicitly path-typed host options; do not rewrite arbitrary provider strings.
- [ ] Add a CDS metadata processor plus data generator coexistence fixture.
- [ ] Add changesets for core and middleware and run their full suites.

**Verification:**

```bash
pnpm --filter @sap-ux/fe-mockserver-core build
pnpm --filter @sap-ux/fe-mockserver-core lint
pnpm --filter @sap-ux/fe-mockserver-core test
pnpm --filter @sap-ux/ui5-middleware-fe-mockserver build
pnpm --filter @sap-ux/ui5-middleware-fe-mockserver lint
pnpm --filter @sap-ux/ui5-middleware-fe-mockserver test
```

**Phase exit gate:** A packed host prerelease loads a deterministic fake provider and passes V2, V4, CDS, existing-data, failure, reload, and disposal contract tests.

## Phase 3 — Scaffold `@sap-ux/mockserver-data-generator`

**Outcome:** `open-ux-tools` contains a small, independently testable public package with a frozen API and no pilot dependencies.

### Task 3.1: Create the package skeleton

**Files in `SAP/open-ux-tools`:**

- Create: `packages/mockserver-data-generator/package.json`
- Create: `packages/mockserver-data-generator/tsconfig.json`
- Create: `packages/mockserver-data-generator/eslint.config.mjs`
- Create: `packages/mockserver-data-generator/jest.config.mjs`
- Create: `packages/mockserver-data-generator/LICENSE`
- Create: `packages/mockserver-data-generator/README.md`
- Create: `packages/mockserver-data-generator/CHANGELOG.md`
- Create: `packages/mockserver-data-generator/src/index.ts`
- Create: `packages/mockserver-data-generator/src/types.ts`
- Create: `packages/mockserver-data-generator/test/unit/api.test.ts`
- Modify: `tsconfig.json`
- Modify: `sonar-project.properties`
- Modify: `.github/CODEOWNERS`
- Create: `.changeset/mockserver-data-generator-initial.md`

- [ ] Write a failing public API test for `generateService`, configuration, result, diagnostics, and injected runtime interfaces.
- [ ] Create version `0.0.0` with a minor changeset for initial `0.1.0` preview.
- [ ] Use `type: module`, NodeNext, explicit `.js` relative imports, strict types, no enums, no `any`, and no non-null assertions.
- [ ] Publish only `LICENSE`, `README.md`, `dist`, and cleared small resources.
- [ ] Add no dependency on any `@mockgen/*` package.
- [ ] Keep inference behind an injected interface until Phase 9 selects a backend.

### Task 3.2: Define the internal module boundaries

**Files:**

- Create: `packages/mockserver-data-generator/src/schema/graph.ts`
- Create: `packages/mockserver-data-generator/src/schema/edmx.ts`
- Create: `packages/mockserver-data-generator/src/schema/csn.ts`
- Create: `packages/mockserver-data-generator/src/schema/annotations.ts`
- Create: `packages/mockserver-data-generator/src/planning/service-plan.ts`
- Create: `packages/mockserver-data-generator/src/generation/service-generator.ts`
- Create: `packages/mockserver-data-generator/src/generation/constraint-engine.ts`
- Create: `packages/mockserver-data-generator/src/generation/coherence.ts`
- Create: `packages/mockserver-data-generator/src/generation/fallback.ts`
- Create: `packages/mockserver-data-generator/src/semantics/classifier.ts`
- Create: `packages/mockserver-data-generator/src/semantics/lexical-fallback.ts`
- Create: `packages/mockserver-data-generator/src/model/contracts.ts`
- Create: `packages/mockserver-data-generator/src/cache/generated-data.ts`
- Create: `packages/mockserver-data-generator/src/diagnostics.ts`
- Create: `packages/mockserver-data-generator/docs/architecture.md`

- [ ] Document the dependency direction: adapters → graph → plan → tiers → validation → cache.
- [ ] Keep model loading out of schema, planning, validation, and cache modules.
- [ ] Keep SAP-specific evidence in the SAP adapter/semantic boundary rather than orchestration.
- [ ] Add an architecture test that rejects imports crossing the declared boundaries.

### Task 3.3: Add package boundary and size tests

**Files:**

- Create: `packages/mockserver-data-generator/scripts/check-package.mjs`
- Create: `packages/mockserver-data-generator/test/contract/package-boundary.test.ts`
- Modify: `packages/mockserver-data-generator/package.json`

- [ ] Fail when `pnpm pack --json` includes `.onnx`, `.safetensors`, `.pt`, `.bin`, JSONL datasets, caches, judge results, absolute developer paths, or source maps.
- [ ] Fail when the packed tarball exceeds 5 MiB.
- [ ] Fail when a published model manifest lacks immutable revision, file size, and SHA-256.
- [ ] Require zero network access during package import and public API construction.

**Verification:**

```bash
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm --filter @sap-ux/mockserver-data-generator lint
pnpm --filter @sap-ux/mockserver-data-generator test
pnpm --filter @sap-ux/mockserver-data-generator pack --pack-destination ./test-output
```

**Phase exit gate:** The package builds, lints, reaches at least 80% coverage, packs below 5 MiB, exposes only the approved API, and contains no learned artifact.

## Phase 4 — Reimplement the deterministic production engine

**Outcome:** Metadata alone produces deterministic, structurally valid, coherent service data even when no model is present.

### Task 4.1: Port the schema graph and SAP adapters with parity fixtures

**Files:**

- Modify: `packages/mockserver-data-generator/src/schema/graph.ts`
- Modify: `packages/mockserver-data-generator/src/schema/edmx.ts`
- Modify: `packages/mockserver-data-generator/src/schema/csn.ts`
- Modify: `packages/mockserver-data-generator/src/schema/annotations.ts`
- Create: `packages/mockserver-data-generator/test/unit/schema/graph.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/schema/edmx.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/schema/csn.test.ts`
- Create: `packages/mockserver-data-generator/test/fixtures/metadata/`

- [ ] Copy small, cleared V2, V4, and CSN fixture inputs; do not copy customer metadata.
- [ ] Write failing tests for namespaces, entity sets, properties, keys, navigation, containment, value lists, annotations, data elements, enum members, precision/scale, nullability, and maximum length.
- [ ] Implement canonical graph ordering, validation, and SHA-256 fingerprinting.
- [ ] Port only pilot behavior covered by a fixture; document intentional changes in `docs/pilot-parity.md`.
- [ ] Add adversarial path and annotation inputs to prevent traversal or unsafe evaluation.

### Task 4.2: Implement service planning and constraints

**Files:**

- Modify: `packages/mockserver-data-generator/src/planning/service-plan.ts`
- Modify: `packages/mockserver-data-generator/src/generation/constraint-engine.ts`
- Create: `packages/mockserver-data-generator/test/unit/planning/service-plan.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/generation/constraint-engine.test.ts`

- [ ] Write failing tests for dependency ordering and cycles.
- [ ] Write failing tests for key uniqueness, composite keys, min/max length, precision/scale, nullable/non-nullable, enum membership, and requested row counts.
- [ ] Make unsatisfiable key/reference domains reduce the affected row count with an explicit diagnostic instead of emitting invalid or duplicate rows.
- [ ] Validate every tier candidate before committing it to a row.

### Task 4.3: Implement T0 declared values and T3 deterministic fallback

**Files:**

- Create: `packages/mockserver-data-generator/src/generation/declared-values.ts`
- Modify: `packages/mockserver-data-generator/src/generation/fallback.ts`
- Create: `packages/mockserver-data-generator/resources/reference-catalogs/`
- Create: `packages/mockserver-data-generator/test/unit/generation/declared-values.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/generation/fallback.test.ts`

- [ ] Write failing tests for enum/value-list/reference-catalog precedence.
- [ ] Write failing type fixtures for every supported EDM primitive and CAP equivalent.
- [ ] Implement deterministic, non-empty, constraint-valid fallback values.
- [ ] Attach provenance and licensing records to every shipped reference catalog.
- [ ] Ensure fallback never needs ONNX Runtime or network access.

### Task 4.4: Implement T1 semantics and coherence without the learned classifier

**Files:**

- Modify: `packages/mockserver-data-generator/src/semantics/lexical-fallback.ts`
- Modify: `packages/mockserver-data-generator/src/generation/coherence.ts`
- Create: `packages/mockserver-data-generator/src/semantics/value-banks.ts`
- Create: `packages/mockserver-data-generator/test/unit/semantics/lexical-fallback.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/generation/coherence.test.ts`

- [ ] Write failing tests for safe lexical/annotation classifications and abstention.
- [ ] Write failing tests for code/text, amount/currency, quantity/unit, person-name, address, start/end date, status, and value-help coherence.
- [ ] Filter bank values by declared constraints before seeded sampling.
- [ ] Cycle finite key banks without collisions.
- [ ] Keep ambiguous or unsupported fields on T3 instead of confident misclassification.

### Task 4.5: Generate and validate one whole service

**Files:**

- Modify: `packages/mockserver-data-generator/src/generation/service-generator.ts`
- Create: `packages/mockserver-data-generator/test/unit/generation/service-generator.test.ts`
- Create: `packages/mockserver-data-generator/test/contract/determinism.test.ts`

- [ ] Write failing parent/child, many-to-one, draft, lookup, and composition fixtures.
- [ ] Generate parents and shared value domains before dependants.
- [ ] Resolve foreign keys only to emitted parent rows or supplied authoritative rows.
- [ ] Run final row and service validation after all tiers.
- [ ] Prove the same schema, existing data, configuration, code version, and seed produces the same output fingerprint.
- [ ] Prove a seed or material input change changes the cache/output fingerprint.

### Task 4.6: Add atomic generated-data caching and safe diagnostics

**Files:**

- Modify: `packages/mockserver-data-generator/src/cache/generated-data.ts`
- Modify: `packages/mockserver-data-generator/src/diagnostics.ts`
- Create: `packages/mockserver-data-generator/test/unit/cache/generated-data.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/diagnostics.test.ts`

- [ ] Write failing tests for cache hit, miss, version invalidation, corruption, concurrent publication, and interrupted write.
- [ ] Include schema, existing-data, configuration, generator-logic, classifier, and LLM fingerprints in the key.
- [ ] Write to a unique temporary path, fsync where supported, validate, and rename atomically.
- [ ] Quarantine corrupt cache entries.
- [ ] Prove diagnostics contain fingerprints, counts, timings, tier shares, and error codes but no raw metadata or generated values.

**Phase exit gate:** V2, V4, and CSN fixtures generate non-empty data with 100% structural validity, deterministic replay, relationship coherence, and no learned runtime installed.

## Phase 5 — Integrate the provider with the standard FE mockserver

**Outcome:** A packed `@sap-ux/mockserver-data-generator` is loaded by one standard `sap-fe-mockserver`; the standard generator remains the default and `npm run start-mock -- --mockgen` opts into MockGen for missing entity sets.

### Task 5.0: Add the flag-gated `start-mock` launcher

**Files:**

- Create: `packages/mockserver-data-generator/src/start.ts`
- Create: `packages/mockserver-data-generator/test/unit/start.test.ts`
- Modify: `packages/mockserver-data-generator/src/cli.ts`
- Modify: `packages/mockserver-data-generator/package.json`
- Modify: `pnpm-lock.yaml`

- [x] Write failing parser tests for `start -- <command>`, an optional exact `--mockgen` in the child arguments, a missing `--`, a missing child command, and duplicate `--mockgen` flags.
- [x] Run `pnpm --filter @sap-ux/mockserver-data-generator test -- start.test.ts` and confirm the tests fail because the launcher does not exist.
- [x] Implement a focused parser that removes only `--mockgen`, preserves the original child argument order byte-for-byte, and produces the child environment with `SAP_UX_MOCKGEN_ENABLED=1` when enabled and `SAP_UX_MOCKGEN_ENABLED=0` otherwise.
- [x] Write failing lifecycle tests using an injected child-process adapter for inherited stdio, shell-free spawning, child exit-code propagation, startup errors, and forwarding `SIGINT`, `SIGTERM`, and `SIGHUP`.
- [x] Add `cross-spawn@7.0.6` plus its existing repository type package, implement the minimum launcher lifecycle, and dispatch `start` separately from the existing `prepare` and `verify` commands.
- [x] Run the focused CLI/launcher tests, then the whole package suite, and commit only the launcher files and lockfile delta.

### Task 5.1: Implement the `/fe-mockserver` provider export

**Files:**

- Create: `packages/mockserver-data-generator/src/fe-mockserver/index.ts`
- Create: `packages/mockserver-data-generator/src/fe-mockserver/provider.ts`
- Create: `packages/mockserver-data-generator/src/fe-mockserver/config.ts`
- Create: `packages/mockserver-data-generator/tsconfig.cjs.json`
- Create: `packages/mockserver-data-generator/test/contract/fe-mockserver-provider.test.ts`
- Modify: `packages/mockserver-data-generator/package.json`

- [ ] Write a failing structural contract test against the host's published SPI types.
- [x] Write a failing inactive-provider test that injects activation `false`, expects exactly `{ resources: {} }`, and proves metadata parsing, generated-data cache access, runtime/model loading, network access, generation, and logging are untouched.
- [x] Inject a small activation predicate whose production default reads only `SAP_UX_MOCKGEN_ENABLED === '1'`; check it before the dynamic generator import or any metadata/cache/model work.
- [ ] Translate raw host metadata, existing-data context, cancellation, and logger into `generateService` without importing host internals.
- [ ] Return immutable rows and safe diagnostics.
- [x] Provide `dispose()` for model sessions and in-flight work; the native
      backend adapters map that lifecycle to ONNX Runtime's `release()` API.
- [ ] Export ESM for direct consumers and a conditional CommonJS `/fe-mockserver` entry for the current host loader.
- [ ] Build the `/fe-mockserver` adapter to an explicit `dist-cjs` output and expose conditional `types`, `import`, and `require` entries from the package export map.
- [ ] Prove that importing either entry performs no download, model load, generation, or filesystem mutation.

### Task 5.2: Build a cross-repository packed-artifact harness

**Files:**

- Create: `packages/mockserver-data-generator/test/integration/fe-mockserver/fixture.ts`
- Create: `packages/mockserver-data-generator/test/integration/fe-mockserver/run-packed.mjs`
- Create: `packages/mockserver-data-generator/test/fixtures/fiori-v2/`
- Create: `packages/mockserver-data-generator/test/fixtures/fiori-v4/`
- Create: `packages/mockserver-data-generator/test/fixtures/fiori-cds/`

- [ ] Pack the host core/middleware prerelease and the generator into a clean temporary application.
- [ ] Test V2 EDMX, V4 EDMX, and CDS metadata processor plus generator.
- [ ] Test JS/JSON mixed data, intentionally empty static data, draft/composition/value-help relationships, and child navigation.
- [ ] Test a packed V4 fixture with provider-owned to-many and to-one containment through direct navigation and `$expand`; document that v1 does not enrich authored-parent containment.
- [ ] Test missing provider, provider load error, generation timeout, malformed rows, and provider disposal.
- [ ] Assert exactly one UI5 custom middleware: `sap-fe-mockserver`.
- [ ] Assert the application serves usable data when the learned runtime is absent.

**Verification:**

```bash
pnpm --filter @sap-ux/mockserver-data-generator test:integration
```

### Task 5.3: Agree and test version compatibility

**Files:**

- Modify in `SAP/open-ux-odata`: `packages/fe-mockserver-core/src/api.ts`
- Modify in `SAP/open-ux-odata`: `packages/ui5-middleware-fe-mockserver/src/index.ts`
- Modify in `SAP/open-ux-odata`: `packages/ui5-middleware-fe-mockserver/test/index.test.ts`
- Create: `packages/mockserver-data-generator/src/host-compatibility.ts`
- Create: `packages/mockserver-data-generator/test/unit/host-compatibility.test.ts`
- Modify: `packages/mockserver-data-generator/src/start.ts`
- Modify: `packages/mockserver-data-generator/test/unit/start.test.ts`
- Modify: `packages/mockserver-data-generator/README.md`
- Modify: `packages/mockserver-data-generator/docs/host-contract.md`

- [x] Add a failing middleware test that requires
      `FEMiddleware.MOCK_DATA_GENERATOR_API_VERSION` to equal `1`.
- [x] Run
      `pnpm --filter @sap-ux/ui5-middleware-fe-mockserver test -- index.test.ts`
      and confirm the assertion fails because the marker is absent.
- [x] Define `MOCK_DATA_GENERATOR_API_VERSION = 1 as const` in the host core API
      and attach the imported constant to the existing CommonJS middleware
      function export without changing its callable default behavior.
- [x] Re-run the focused middleware test and both affected host builds.
- [x] Add failing generator tests for compatible, missing, unloadable, and
      wrong-version middleware exports. The public assertion API must accept an
      injected loader so these cases do not depend on ambient `node_modules`.
- [x] Add failing launcher tests proving `--mockgen` checks compatibility before
      spawn, an incompatible host prevents spawn with a path-free diagnostic,
      and the unflagged command performs no compatibility lookup.
- [x] Run
      `pnpm --filter @sap-ux/mockserver-data-generator test -- host-compatibility.test.ts start.test.ts`
      and confirm failure occurs because the assertion module and launcher hook
      do not exist.
- [x] Implement a fixed-name application-local loader with `createRequire`,
      require the middleware marker to equal `1`, and emit only:
      `MockGen requires a compatible @sap-ux/ui5-middleware-fe-mockserver with mock data generator API version 1. Run npm run start-mock without --mockgen to use standard mock data.`
- [x] Invoke the assertion only for parsed `--mockgen` starts and before child
      process creation; leave signal handling and all ordinary child arguments
      unchanged.
- [x] Document capability-based compatibility and the host-first release order.
      Record exact minimum npm versions only after the host packages are
      published, rather than guessing prerelease numbers.
- [x] Run both repository package suites, builds, and lints on Node 22 and Node
      24; rebuild the clean development kit and repeat the literal standard and
      flagged application commands before pushing either branch.

**Phase exit gate:** Clean packed V2, V4, and CDS applications prove both commands: `npm run start-mock` uses standard generation with no MockGen work, while `npm run start-mock -- --mockgen` uses the provider for missing data. Both preserve authored data and fall back safely when learned components are unavailable.

## Phase 6 — Guard the narrow shared-package boundary

**Outcome:** MockGen production bootstrapping is isolated to the existing mockserver config writer; unrelated UI5 configuration, creation, and MCP packages remain unchanged.

### Task 6.1: Keep shared packages unchanged

- [x] Keep `packages/ui5-config` byte-identical to `origin/main`.
- [x] Limit `packages/mockserver-config-writer` to the approved direct dependency, provider, launcher, and removal lifecycle.
- [x] Keep `packages/create` byte-identical to `origin/main`.
- [x] Keep `packages/fiori-mcp-server` byte-identical to `origin/main`.
- [x] Add the writer feature changeset plus the repository-required patch
      cascade for `@sap-ux/fiori-mcp-server`, which bundles the writer; do not
      change MCP production source.
- [x] Keep unpublished local/BAS package and model-path overrides in the MockGen development-kit script.

**Verification:**

```bash
git diff --exit-code origin/main -- packages/ui5-config packages/create packages/fiori-mcp-server
git diff --name-only origin/main -- packages/mockserver-config-writer
```

**Phase exit gate:** Only the mockserver config writer has the approved production-bootstrap diff, the three unrelated package trees remain unchanged, and the development kit still installs and verifies unpublished artifacts in an existing Fiori application.

## Phase 6A — Build the local and BAS developer test kit

**Outcome:** A developer can install the exact packages built from the current source into an existing generated Fiori elements application, verify the standard mockserver end to end, and safely restore the application. The same packed artifacts can be copied to BAS without relying on paths or `node_modules` from the developer's Mac.

### Task 6A.1: Build and fingerprint the unpublished package set

**Files:**

- Create: `scripts/mockserver-data-generator-dev-kit/build-dev-kit.mjs`
- Create: `scripts/mockserver-data-generator-dev-kit/lib/artifacts.mjs`
- Create: `scripts/mockserver-data-generator-dev-kit/lib/manifest.mjs`
- Create: `scripts/mockserver-data-generator-dev-kit/lib/bundle-installer.mjs`
- Create: `tests/integration/mockserver-data-generator/package.json`
- Create: `tests/integration/mockserver-data-generator/tsconfig.json`
- Create: `tests/integration/mockserver-data-generator/eslint.config.mjs`
- Create: `tests/integration/mockserver-data-generator/jest.config.mjs`
- Create: `tests/integration/mockserver-data-generator/src/dev-kit/build-dev-kit.test.ts`
- Modify: root `package.json`

- [ ] Name the integration workspace `@sap-ux-private/mockserver-data-generator-integration-tests` and give it explicit `test`, `test:integration`, and lint scripts.
- [ ] Write failing tests for clean output, missing builds, package-name/version mismatches, spaces in paths, checksum mismatch, path traversal, absolute paths, symlink/hardlink entries, unsafe modes, and archive contents.
- [ ] Add root commands `mockserver-data-generator:dev-kit` and `mockserver-data-generator:dev-install` that run with the repository's pinned Node and pnpm requirements.
- [ ] Always run each package's clean build before `pnpm pack --json`; never trust ambient `dist`.
- [ ] Pack `@sap-ux/mockserver-data-generator` plus the matching unpublished host core and middleware that contain the SPI.
- [x] Accept either `--host-root <open-ux-odata-worktree>` or explicit `--host-core-tgz` and `--host-middleware-tgz` inputs; reject an incomplete or incompatible set.
- [x] Use the `@sap-ux/mockserver-config-writer` public API for standard MockGen wiring, then replace only the registry dependency and optional model paths with development-kit values.
- [x] Prove the bundled installer has no imports back into either workspace and record its source package version, inventory, byte size, and hash.
- [ ] Record package name, version, source repository, source commit, dirty-state flag, packed-file inventory, byte size, and SHA-256 in `dev-kit-manifest.json`.
- [ ] Allow intentional dirty development trees but label the kit non-reproducible; add `--require-clean` for a shareable BAS canary or review artifact.
- [ ] Inspect every tarball and fail if expected exports or `dist` are absent, if a model/checkpoint/training artifact is present, or if an absolute developer path is embedded.
- [ ] Build the archive in a temporary directory, reread and validate every entry, and publish it atomically to `--out`; never include `node_modules`, the model cache, credentials, or platform-specific native output copied from another installation.

**Direct local example:**

```bash
fnm exec --using=22.22.3 -- corepack pnpm mockserver-data-generator:dev-install \
    --app /absolute/path/to/generated-fiori-app \
    --host-root /absolute/path/to/open-ux-odata \
    --verify
```

**Portable kit example:**

```bash
fnm exec --using=22.22.3 -- corepack pnpm mockserver-data-generator:dev-kit \
    --host-root /absolute/path/to/open-ux-odata \
    --out ./test-output
```

### Task 6A.2: Implement a transactional existing-application installer

**Files:**

- Create: `scripts/mockserver-data-generator-dev-kit/setup-local-fiori-app.mjs`
- Create: `scripts/mockserver-data-generator-dev-kit/lib/app-state.mjs`
- Create: `scripts/mockserver-data-generator-dev-kit/lib/package-manager.mjs`
- Create: `scripts/mockserver-data-generator-dev-kit/lib/configure-app.mjs`
- Create: `tests/integration/mockserver-data-generator/src/dev-kit/setup-local-fiori-app.test.ts`

- [ ] Write failing tests before implementing path validation, dry-run, install, repeat install, conflict detection, failure propagation, and restore.
- [ ] Require `--app <absolute-path>` and verify that the target has `package.json`, `webapp/manifest.json`, and an applicable UI5 configuration; explicitly refuse either tool repository as the application target.
- [ ] Resolve and `lstat` the application root and every mutation target, refuse symlinked targets, and prove all destinations remain beneath the explicit application root before each write. Treat a Git worktree's external gitdir as out of bounds.
- [ ] Detect npm or pnpm from the application's lockfile, reject mixed lockfiles, validate the supported runtime, and spawn commands with argument arrays so paths with spaces and Windows `npm.cmd` work.
- [ ] Copy the verified tarballs into `<app>/.mockserver-data-generator-dev/packages` before changing dependencies so all saved `file:` specifications remain valid after the source checkout or dev-kit archive moves.
- [ ] Configure only the existing `sap-fe-mockserver` by calling the bundled/local config-writer code. Do not call a registry `npx`, introduce another middleware, add the generator to legacy `ui5.dependencies`, or create `ui5-mockgen.yaml`/`start-mockgen`.
- [ ] Add the generator, matching host core, and middleware tarballs as application-local `file:` development dependencies in one awaited package-manager operation; propagate a nonzero install result.
- [x] Preserve existing services, mock paths, hand-authored data, and the single existing `start-mock` script. Replace only a supported simple Fiori command `X` with `mockserver-data-generator start -- X`; reject shell operators, environment assignments, command substitution, an already unrelated wrapper, or a missing/ambiguous `start-mock` rather than rewriting it.
- [x] Make the launcher rewrite idempotent and record the exact original script in the existing recovery journal so `--restore` returns it byte-for-byte.
- [ ] Atomically write a recovery journal with original content and pre-install hashes before the first application edit; append expected/post-install hashes and package-manager state as each step completes.
- [ ] Implement `--dry-run` without filesystem or package-manager writes.
- [ ] Make repeat installation idempotent while allowing a newly packed build to replace the prior dev artifact and lockfile resolution.
- [ ] On package-manager failure, termination signal, or later setup failure, automatically roll back only installer-owned changes whose hashes are still safe; retain the journal and exact recovery command if automatic rollback cannot complete.
- [ ] Implement `--restore`; restore a file only if its current hash still equals the recorded post-install hash, otherwise refuse to overwrite the developer's later edit and report the exact conflict.
- [ ] After restoring the original manifest and lockfile, run the package manager in frozen/clean mode so `node_modules` matches the restored dependency graph; report file restoration and dependency reconciliation independently.
- [ ] Add only `.mockserver-data-generator-dev/` to the application's local `.git/info/exclude` when that path is contained and safe. Track the exact inserted line and remove it on restore; otherwise leave a warning. Keep `package.json`, the lockfile, and `ui5-mock.yaml` changes visible to the developer.

### Task 6A.3: Verify the installed application, not merely package imports

**Files:**

- Create: `scripts/mockserver-data-generator-dev-kit/lib/verify-app.mjs`
- Create: `tests/integration/mockserver-data-generator/src/dev-kit/verify-app.test.ts`
- Create: `tests/integration/mockserver-data-generator/src/install-and-start.test.ts`
- Reuse: `packages/mockserver-data-generator/test/fixtures/fiori-v2/`
- Reuse: `packages/mockserver-data-generator/test/fixtures/fiori-v4/`
- Reuse: `packages/mockserver-data-generator/test/fixtures/fiori-cds/`

- [ ] Verify installed package manifests, resolved `file:` origins, versions, checksums, required exports, and host/provider compatibility from the target application's `node_modules`.
- [ ] Run the application's local UI5 CLI tree inspection against `ui5-mock.yaml` and require exactly one `sap-fe-mockserver`.
- [x] Require no generator entry in `package.json.ui5.dependencies`, no second mock YAML, and no `start-mockgen` script.
- [ ] For `--verify`, choose a free loopback port, resolve the application-local Fiori/UI5 executable, and run the equivalent `fiori run --config ui5-mock.yaml` command headlessly without the script's common `--open` argument. Wait with a bounded timeout, request `$metadata` and the first discoverable entity set, record structured diagnostics, and always terminate the process tree.
- [x] Prove the application retains exactly one `start-mock` script, that its original Fiori command and arguments are preserved behind the launcher, and that it still targets `ui5-mock.yaml`; do not blindly execute arbitrary application script contents during verification.
- [x] Run two canaries from the parsed child command: one with `SAP_UX_MOCKGEN_ENABLED=0` and one with `SAP_UX_MOCKGEN_ENABLED=1`. The disabled canary must show standard generated rows and no provider-generation evidence; the enabled canary must show provider rows or a recorded safe degradation reason.
- [ ] Keep startup opt-in: normal setup exits after configuration, `--verify` runs and stops a canary, and `--start` intentionally leaves the foreground server to the developer.
- [ ] Cover applications with and without prior mockserver configuration, OData V2, OData V4, CDS-through-FE, existing mock-file precedence, absent/corrupt model fallback, reinstall of a newer local tarball, interrupted install, and paths containing spaces.
- [ ] Prove the standard mockserver still starts when the learned provider is unavailable and distinguish `installed`, `integrationVerified`, and `realismReady` in the summary.
- [ ] Add explicit model acquisition through `--prepare-model` in Phase 7. Development tests use fake or local pilot artifacts; public model manifests and downloads remain disabled until redistribution clearance. Default verification tests deterministic fallback or an already warm fake cache without silently downloading a large model.

### Task 6A.4: Qualify the portable BAS workflow

**Files:**

- Create: `scripts/mockserver-data-generator-dev-kit/README.md`
- Create: `tests/integration/mockserver-data-generator/src/dev-kit/dev-kit-archive.test.ts`
- Create: `docs/quality/mockserver-data-generator-bas-canary.md`

- [ ] Put only tarballs, the self-contained installer, integrity manifest, license notices, and concise instructions in `mockserver-data-generator-dev-kit-<fingerprint>.tgz`.
- [ ] Emit the exact archive fingerprint and SHA-256 for out-of-band transfer; never document a wildcard as the archive selected for installation.
- [ ] Test archive extraction and installation on Linux CI without access to either source worktree.
- [ ] Document that the kit is portable but not inherently air-gapped: non-local transitive dependencies still require the application's package-manager cache or registry access.
- [ ] Support `--offline` as an explicit preflight that fails before edits when the complete dependency closure is unavailable locally.
- [ ] Run at least one actual BAS canary because local Linux cannot prove BAS proxy, certificate, filesystem, preview routing, or runtime behavior.
- [ ] In BAS, extract beneath a stable tools directory, run the bundled installer against the generated application, execute `--verify`, optionally run `--prepare-model` for a Phase 7-qualified and distributable kit, and finally prove both `npm run start-mock` and `npm run start-mock -- --mockgen`.
- [ ] Record BAS image/runtime, app fixture fingerprint, dev-kit hash, package resolutions, model state, endpoint results, and cleanup/restore result without storing credentials or application data.

**BAS example:**

```bash
DEV_KIT_ARCHIVE="mockserver-data-generator-dev-kit-<fingerprint>.tgz"
DEV_KIT_SHA256="<sha256-copied-from-the-build-report>"
DEV_KIT_DIR="$HOME/tools/mockserver-data-generator-dev-<fingerprint>"
node -e 'const [a,b,c]=process.versions.node.split(".").map(Number);if(a<22||(a===22&&(b<22||(b===22&&c<2))))throw Error("Node >=22.22.2 is required")'
printf '%s  %s\n' "$DEV_KIT_SHA256" "$DEV_KIT_ARCHIVE" | sha256sum --check --strict -
test ! -e "$DEV_KIT_DIR"
mkdir "$DEV_KIT_DIR"
tar --extract --gzip --file "$DEV_KIT_ARCHIVE" \
    --directory "$DEV_KIT_DIR" --strip-components=1 \
    --no-same-owner --no-same-permissions
node "$DEV_KIT_DIR/setup-local-fiori-app.mjs" \
    --app "$PWD" --verify
npm run start-mock
npm run start-mock -- --mockgen
```

**Verification:**

```bash
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests test -- dev-kit
pnpm --filter @sap-ux/mockserver-data-generator pack
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests test:integration
```

**Phase exit gate:** One command installs the current packed generator and unpublished compatible host into existing generated V2, V4, and CDS-through-FE applications; `--verify` exercises UI5 discovery and HTTP data; `--restore` returns an unedited app to its prior state; and the same hashed archive passes an actual BAS canary. The workflow makes no registry assumption for the unpublished packages, creates no second middleware/start flow, and copies no `node_modules`.

## Phase 7 — Implement safe model acquisition and an injected inference runtime

**Outcome:** Immutable learned artifacts can be acquired on first use, reused offline, and rejected safely without growing the npm package.

### Task 7.1: Define and validate the model manifest

**Files:**

- Create: `packages/mockserver-data-generator/resources/model-manifest.json`
- Create: `packages/mockserver-data-generator/src/model/manifest.ts`
- Create: `packages/mockserver-data-generator/test/unit/model/manifest.test.ts`
- Create: `packages/mockserver-data-generator/test/fixtures/models/tiny-valid/`
- Create: `packages/mockserver-data-generator/test/fixtures/models/invalid/`

- [ ] Write failing tests for schema version, component role, immutable repository revision, filename, byte size, SHA-256, tokenizer/config contract, ONNX I/O contract, output grammar, model lifecycle state, and license/model-card links.
- [ ] Version classifier, SFT generator, and inference runtime independently.
- [ ] Reject mutable revisions, unknown output formats, path traversal, duplicate files, and mismatched sizes/hashes.
- [ ] Include component fingerprints in the generation cache key.

### Task 7.2: Implement download, locking, and local cache publication

**Files:**

- Create: `packages/mockserver-data-generator/src/model/resolver.ts`
- Create: `packages/mockserver-data-generator/src/model/downloader.ts`
- Create: `packages/mockserver-data-generator/src/model/model-cache.ts`
- Create: `packages/mockserver-data-generator/src/cli.ts`
- Modify: `packages/mockserver-data-generator/package.json`
- Create: `packages/mockserver-data-generator/test/unit/model/resolver.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/model/downloader.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/model/model-cache.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/cli.test.ts`

- [ ] Write failing tests for valid cache, offline hit/miss, proxy/mirror, interrupted transfer, checksum mismatch, oversized response, concurrent processes, lock expiry, and atomic rename.
- [ ] Store artifacts beneath the existing SAP/Fiori tools user-data convention, in a `mockserver-data-generator` subdirectory; do not hard-code `$HOME`.
- [ ] Download to a unique temporary file, stream-hash, check declared size, fsync where supported, and rename atomically.
- [ ] Never treat a partial or unverified file as a cache hit.
- [ ] Support an approved internal mirror override without allowing arbitrary application config to bypass hashes.
- [ ] Make warm-cache execution perform no network call.
- [ ] Add `mockserver-data-generator prepare` to acquire and verify pinned artifacts before an offline session; do not add another application start script.
- [ ] Add `mockserver-data-generator verify` to check cached hashes and report component fingerprints without printing local data.
- [ ] Bound automatic provider acquisition to 30 seconds before deterministic fallback; retain incomplete data only as a non-loadable resumable temporary file.

**Implementation record (2026-09-05):** The production downloader and CLI now
cover immutable manifests, streamed size/hash verification, secure redirects,
mirror selection, unique partial publication, cross-process ownership fencing,
late cancellation, warm offline verification, and bounded acquisition. Commit
`912306df4df55103d858f29aad9896583c814337` adds lazy `HTTP_PROXY`,
`HTTPS_PROXY`, and `NO_PROXY` handling through a locally verified CONNECT path;
actual BAS HTTPS proxy and certificate behavior remains a platform gate.

### Task 7.3: Add runtime contracts and degradation

**Files:**

- Modify: `packages/mockserver-data-generator/src/model/contracts.ts`
- Create: `packages/mockserver-data-generator/src/model/runtime.ts`
- Create: `packages/mockserver-data-generator/src/generation/llm-values.ts`
- Modify: `packages/mockserver-data-generator/src/semantics/classifier.ts`
- Create: `packages/mockserver-data-generator/test/unit/model/runtime.test.ts`
- Create: `packages/mockserver-data-generator/test/unit/generation/llm-values.test.ts`

- [ ] Write failing tests with a tiny fake runtime for classifier inference, grammar-constrained row completion, timeout, cancellation, malformed output, unsupported platform, and disposal.
- [ ] Load model sessions lazily only after generated-data cache miss.
- [ ] Allow T0/T1/T3 to complete when either learned component is missing or rejected.
- [ ] Stop retrying a failed model in the current process and permit a retry on the next process start.
- [ ] Validate all learned values through the same constraint engine.
- [ ] Keep model implementation details out of the FE host adapter.

### Task 7.4: Add offline and supply-chain integration tests

**Files:**

- Create: `packages/mockserver-data-generator/test/integration/model-acquisition.test.ts`
- Create: `packages/mockserver-data-generator/test/integration/model-failure.test.ts`

- [ ] Test online first acquisition against a local HTTP fixture server.
- [ ] Disable network and prove the second run uses the verified cache.
- [ ] Prove import and generated-data cache hit make no request.
- [ ] Prove corrupt, truncated, concurrent, and interrupted downloads never expose a loadable artifact.
- [ ] Do not download production models in pull-request CI.

**Phase exit gate:** Tiny-artifact tests pass across supported operating systems; checksum mismatch never loads; network/runtime failure leaves usable deterministic data.

## Phase 8 — Rebuild governed datasets and train production candidates

**Outcome:** Existing data investment is retained only after leakage, label-provenance, lineage, and evaluation-isolation checks pass and any identified failure is governed and repaired.

### Task 8.1: Materialize canonical, service-disjoint partitions

**Files in internal model repository:**

- Create: `datasets/classifier/train-v1.jsonl`
- Create: `datasets/classifier/calibration-v1.jsonl`
- Create: `datasets/classifier/final-holdout-v1.jsonl`
- Create: `datasets/generator/train-v1.jsonl`
- Create: `datasets/generator/development-v1.jsonl`
- Create: `datasets/generator/final-holdout-v1.jsonl`
- Create: `datasets/partition-manifest-v1.json`
- Create: `scripts/build_partitions.py`
- Test: `tests/test_partitions.py`

- [ ] Start from the governed classifier and prepared SFT examples plus their cleared raw sources.
- [ ] Add source repository, application/service, entity, license/privacy class, and transform lineage to every example.
- [ ] Normalize and deduplicate prompts/completions and near-duplicate classifier inputs before splitting.
- [ ] Split by source service or application family, never by generated row.
- [ ] Preserve the existing service-disjoint classifier calibration set if its fingerprint and governance remain valid.
- [ ] Reserve whole unseen services for the final output-quality cohort.
- [ ] Make partitioning deterministic from a recorded seed and write hashes before training.

**Exit gate:** Zero exact prompt/completion duplicates and zero source-service overlap across training, calibration/development, and final holdout; every row maps to a cleared source.

### Task 8.2: Reproduce the pilot baseline in a pinned environment

**Files:**

- Create: `containers/training/Dockerfile`
- Create: `environments/training-lock.txt`
- Create: `experiments/pilot-reproduction-v1.yaml`
- Create: `reports/pilot-reproduction-v1.json`

- [ ] Reproduce the selective classifier and generator LoRA run from frozen data and exact base-model revision.
- [ ] Export FP32 and dynamic-int8 ONNX artifacts.
- [ ] Verify tokenizer, layer dimensions, KV-cache I/O, output grammar, and ONNX/PyTorch parity.
- [ ] Compare parse rate, fill ratio, classifier routed precision/coverage, throughput, and output fingerprints to stored pilot evidence.
- [ ] Use cleared pilot-domain fixtures only as regression inputs, never as proof of generalization.

**Exit gate:** One documented command reproduces the baseline or every material difference is explained and approved.

### Task 8.3: Train and calibrate the production classifier

**Files:**

- Create: `experiments/classifier-candidates-v1.yaml`
- Create: `reports/classifier-candidates-v1.json`
- Create: `models/classifier/v0.1.0-candidate.1/manifest.json`

- [ ] Train only on governed, resolved labels and retain `unknown` as a genuine negative class.
- [ ] Compare the cleared pilot classifier baseline with a compact word-SGD candidate and any justified distilled candidate.
- [ ] Calibrate temperature, abstention threshold, and coverage on the frozen calibration partition.
- [ ] Evaluate the governed adjudication set, service-disjoint SAP, non-SAP, adversarial unknown, sparse annotation, and non-English-label probes.
- [ ] Measure downstream data quality as well as classifier metrics.
- [ ] Export the exact candidate used by the Node runtime and verify route parity around threshold boundaries.

**Promotion gate:** Meet or improve the approved fingerprint-bound routed-precision, coverage, calibration-error, direct-consensus, per-domain, and artifact-size baselines recorded in the private promotion policy. Public release material states the accepted thresholds only after disclosure clearance.

### Task 8.4: Train service-disjoint SFT generator candidates

**Files:**

- Create: `experiments/generator-candidates-v1.yaml`
- Create: `reports/generator-candidates-v1.json`
- Create: `models/generator/v0.1.0-candidate.1/manifest.json`

- [ ] Train the baseline and candidates on the rebuilt SFT partitions with fixed seeds and exact base-model revision.
- [ ] Preserve the merged prefill/decode KV-cache contract and `row-object-v1` grammar unless a separately versioned runtime contract is implemented.
- [ ] Export FP32 and dynamic-int8 baseline artifacts before other optimization.
- [ ] Record model/tokenizer bytes, parse rate, requested-field fill, valid rows, throughput, and memory.
- [ ] Reject a candidate when any evaluated entity produces zero valid rows unless its fingerprinted fixture declared `expectedEmpty: true` before execution.

**Phase exit gate:** One governed classifier candidate and at least one reproducible generator baseline are ready for the footprint campaign; no training result is called promoted yet.

## Phase 9 — Evaluate model and runtime footprint

**Outcome:** The smallest candidate that satisfies quality and latency gates is selected, and WASM receives a documented go/no-go decision.

### Task 9.1: Establish separate package, runtime, model, and cache baselines

**Files:**

- Create in model repository: `benchmarks/footprint-baseline-v1.json`
- Create in `open-ux-tools`: `packages/mockserver-data-generator/scripts/measure-footprint.mjs`
- Create: `packages/mockserver-data-generator/test/contract/footprint-report.test.ts`

- [x] Measure packed and unpacked npm bytes without models.
- [ ] Measure clean-install dependency bytes for each OS/architecture.
- [x] Measure classifier, tokenizer, generator, and manifest bytes separately.
- [ ] Measure first download, warm cache, session load, peak RSS, tokens/second, cold generation, and generated-data-cache startup.
- [x] Bind every row of the report to package, runtime, model, code, fixture, and machine fingerprints.

**Implementation record (2026-09-04):** Commits `4112b622e` through
`568aaf8b0` add the portable machine-readable harness, close its evidence
binding gaps, and accelerate grammar-constrained decoding without changing the
fixed output. The clean `darwin-arm64` baseline binds the package archive,
complete compiled tree, code commit, model manifest, production generation
config, runtime, full frozen classifier/SFT cohorts, evaluation report, and
machine details. Package, dependency closure, runtime increment, component,
model-cache, cache-quota, module-load, session-load, T2, and process RSS values
are measured separately. Two complete 16-case production-config runs reproduced
100% parse/exact-key success, 259/261 filled fields, and the same output
fingerprint; their T2 p95 values were 18.73 and 18.55 seconds. The current native
candidate is not footprint-ready: 449,503,668 total bytes exceed the 300 MiB
ceiling, and the 164,924,986-byte generator misses the 82,462,493-byte
optimization target. First-download, cold whole-service, warm
generated-data-cache, end-to-end host, tokens-per-second, process-tree memory,
and release-platform rows remain open, so the Task 9.1 exit conditions are not
marked complete.

### Task 9.2: Run the generator compression campaign

**Files in model repository:**

- Create: `experiments/generator-footprint-frontier-v1.yaml`
- Create: `reports/generator-footprint-frontier-v1.json`

- [x] Candidate 1: dynamic int8 baseline.
- [x] Candidate 2: ONNX graph optimization and per-channel INT8; run static activation calibration only when the size/latency screen justifies it.
- [x] Candidate 3: determine whether the chosen export/runtime supports an end-to-end calibrated GPTQ/AWQ-style four-bit path; reject partial calibration.
- [x] Candidate 4: qualify whether quantization-aware fine-tuning is justified after post-training candidates miss; stop before QAT when the reduced-token FP32 source model itself misses quality gates.
- [x] Candidate 5: vocabulary pruning or a domain tokenizer when embedding/output matrices dominate size.
- [x] Candidate 6: qualify a smaller architecture with ordinary recovery and teacher-guided structural distillation; reject it when the maximum size-passing student misses the frozen structural gates.
- [x] Treat every uncalibrated low-precision result as ineligible; retain any historical negative report only in the governed private evidence store.

**Compression record (2026-09-04):** The candidate-manifest evaluator added in
`b00b1e0d8` runs arbitrary external graphs through the exact production decoder
and frozen SFT cohort without copying weights into either Open UX repository.
It binds model, tokenizer, generation configuration, manifest, and quantization
evidence; suppresses implicit pilot candidates; rejects duplicate IDs; and
cannot label partially calibrated or uncalibrated artifacts promotion-eligible.

The optimized dynamic per-channel `QUInt8` screen produced a 165,323,027-byte
graph, 398,041 bytes larger than the retained INT8 baseline, so static
activation calibration was stopped: it cannot reduce already-eight-bit stored
weights and is not the recommended transformer path. Full `MatMul` plus
embedding-`Gather` RTN INT4 reached 105,726,471 bytes but remained uncalibrated
and missed the target. A second probe applied representative GPTQ calibration
to all 211 constant-weight `MatMul` nodes using fixed production prompts from
bookshop, finance, and northwind, then used the only supported four-bit
`Gather` path, RTN, for the embedding. That 105,218,355-byte partially
calibrated graph preserved the ONNX contract but failed the clean full cohort:
11/16 parse and exact-key success, 85/261 filled fields, despite a 10.29-second
T2 p95. It is rejected, and no realism judging is warranted. Because it still
exceeds the target by 22,755,862 bytes, QAT alone cannot solve the footprint;
Candidate 4 should be coupled to a reduced vocabulary or smaller architecture
rather than run against the unchanged 135M graph.

Candidate 5 then tested the vocabulary branch through the production evaluator.
An intentionally ineligible 10,813-token upper bound showed that a combined
vocabulary and four-bit graph can meet the byte target, but GPTQ/RTN quality
collapsed to 11/16 parsed cases and 83/261 filled fields. The valid training-only
closure retained 10,073 tokens with exact remapping across all 2,877 training
records; inherited INT8 reached 15/16 parsed cases and 238/261 filled fields,
still below the gate. An 18,000-token rank-fill variant and two bounded recovery
experiments regressed further. The repository now includes a portable,
training-only vocabulary-candidate builder so the exact 10,073-token regime can
be reproduced without storing training payloads or model weights. Candidate 5
is complete and rejected as a checkpoint-retrofit strategy.

Candidate 4 then trained a fresh 10,000-token model from the original base using
a data-independent pretrained-rank vocabulary, with no evaluation or held-out
token ids used for selection. The full three-epoch SFT improved evaluation loss
from 1.105903 to 0.555240, but the source FP32 model reached only 11/16 parsed
cases and 116/261 filled fields. Dynamic INT8 reached 12/16 and 118/261. A
400-token diagnostic was identical; a bounded 600-token diagnostic reached
13/16 and 166/261 and still failed the frozen structural gates. The clean replay
binds evaluator commit `0c7532c0941d382478f9508fa292d5a499af0b8d` and report
fingerprint
`362191ba9ed9852cd043b718bdd37e11e67db42a5c744b0a183036ab4b50d2d4`.
Because failure occurs before quantization, QAT and low-bit export cannot repair
this source-model contract and realism judging is not warranted. Candidate 4 is
therefore closed at its precondition.

Candidate 6 established byte feasibility for a smaller architecture while
preserving the proven 49,152-token tokenizer. A six-layer student initialized
bit-exactly from uniformly spaced task-specific teacher layers produced a
78,305,643-byte dynamic-INT8 graph, 52.52% below the retained generator and
4,156,850 bytes under target. Direct pruning completed 0/16 frozen JSON cases.
A full-parameter, three-epoch recovery SFT completed all 3,447 scheduled examples
and improved held-back evaluation loss from 15.983883 to 2.926326, but the
recovered FP32 candidate reached only 4/16 parsed cases and 15/261 fields; INT8
reached 5/16 and 30/261. The combined report fingerprint is
`a694bcea288bffa1ad254133f17a7b8c12d6887bc75d85ec2f7d9fd18fefb4e4`.
Uniform depth pruning plus ordinary SFT is rejected, and no realism judging is
warranted. The remaining bounded Candidate 6 experiment therefore used
teacher-guided structural-token distillation rather than repeating ordinary SFT
or token-budget tuning.

A subsequent exact boundary screen corrected the conservative depth estimate:
a seven-layer, same-width, full-tokenizer INT8 graph is 81,913,038 bytes and
still clears the target by 549,455 bytes with its exact causal-cache contract.
Seven layers is the maximum-capacity base for that distillation experiment; the
size-evidence fingerprint is
`ce04ce2ffc7f664b41c7a8d7feba32b29769a3eab4c8cb74b020ef3c842b4dd0`.

The seven-layer experiment cached top-32 teacher logits for all 1,149 training
records and 492,934 completion tokens without storing raw text. Its
full-parameter three-epoch objective combined hard labels, temperature-2
teacher distillation, and a three-times weight for structural JSON tokens while
keeping the frozen production cohort out of training. Held-back loss improved
from 11.581748 to 2.903704, but the FP32 source reached only 2/16 parsed cases
and 11/261 fields. The 81,913,038-byte INT8 export remained 549,455 bytes under
the target but reached only 4/16 and 28/261. The clean report binds commit
`fdc8dc8054f4fef5495d8a31188b06e1a4898b45`, fingerprint
`7bb267f0af047068c383f880322735563915d4c4d1fa0df6ede41fcd31a8c148`,
and file SHA-256
`0d4e25d67f93e8d9563c9be1802fa3457b26aa1e51cc22def9b0266744241871`.
The consolidated rejected-campaign fingerprint is
`c66f98d8058c307046da5daa724f9991d7fa21e47af721806f017b4a276f54b7`;
its file SHA-256 is
`35b2088d357e218170791fc037ea9f73db2ab1c2a8dac60d95de3c25b39a4288`.
Candidate 6 is complete and rejected: it proves byte feasibility but not usable
generation. No realism judging is warranted, and the retained pilot INT8 model
remains the quality baseline; the subsequent platform-runtime task must resolve
the overall footprint.

For every candidate, record model/tokenizer/transfer bytes, load time, peak RSS, throughput, cold/warm latency, parse success, fill ratio, requested-row completion, schema/type/nullability/length/precision-scale/key/enum/FK/containment/navigation validity, relationship/coherence assertions, determinism, and fresh realism score. Count every frozen T2 attempt, including timeouts, empty responses, and malformed responses, in the parse denominator. Freeze eligible requested scalar slots before execution for the fill denominator; exclude authored, computed, server-managed, and metadata-defaulted slots before observing output.

**Candidate gate:** At least 99% raw-response parse/decode success, at least 95% eligible requested-field fill before deterministic fallback, no zero-row entity unless its fixture was predeclared `expectedEmpty`, 100% integrated structural and frozen relationship/coherence assertions, deterministic replay, no material throughput regression, and all realism gates. Size alone cannot win.

### Task 9.3: Run the native-versus-WASM runtime experiment

**Files:**

- Create: `packages/mockserver-data-generator/bench/runtime-native.mjs`
- Create: `packages/mockserver-data-generator/bench/runtime-wasm.mjs`
- Create in model repository: `reports/runtime-backend-decision-v1.md`

- [ ] Reuse the feature's verified package-bundling harness as a starting point, not as proof that autoregressive generation performs adequately.
- [ ] Compare `onnxruntime-node`, platform-specific native packaging where maintainable, and ONNX Runtime Web/WASM under Node/BAS.
- [ ] Run identical classifier and autoregressive generator artifacts through each viable backend.
- [ ] Test macOS arm64/x64, Linux x64/BAS, and Windows x64 under the supported Node matrix.
- [ ] Measure installed bytes, startup, peak RSS, decoder throughput, p50/p95 generation, stability, and worker/thread behavior.

**WASM gate:** On the fixed primary platform, advance only if `1 - wasmBackendBytes / nativeBackendBytes >= 25%` for the package plus backend-specific production dependency closure while identical model/cache bytes are held constant. Every proposed WASM platform must pass independently; samples are never pooled. It must pass all functional tests and memory limits and have p95 no worse than 1.5 times native while remaining inside the 20-second T2 budget. Report product-total impact separately. Otherwise record a no-go and keep the best supported native strategy.

**Implementation record (2026-09-04):** The bounded identical-classifier screen
measured Web/WASM p95 at 2.90 times native and about twice the native process
maximum RSS. It fails the frozen 1.5-times latency gate, while the total product
footprint reduction would be only 20.74% with identical model bytes. Per the
predeclared stop rule, WASM is a no-go and the autoregressive WASM, packaging,
and multi-platform work above is intentionally not implemented. The native
candidate remains the baseline while model compression and supported
platform-specific runtime packaging are evaluated.

An archive-bound `darwin-arm64` feasibility proof then retained only the native
subtree selected by `onnxruntime-node@1.24.3`. On clean commit
`0eb470fa97035547589a2b2bae4a86668042d6c2`, the 10,195,380-byte archive ran the
full 233-case classifier and 16-case SFT cohorts with unchanged SFT output,
16/16 parse/exact-key, and 259/261 fill. The independently reinstalled footprint
was 264,635,750 bytes against the 314,572,800-byte ceiling. Evaluation and
footprint reports bind archive SHA-256
`a9ebf9496d8c5cbefae9e4204779e9744e42ffb74e8bc342464abcea347de24f`.
This proves local size/API/quality feasibility, not maintainable distribution or
the required cross-platform matrix; the same-name hand-built archive is not a
release artifact.

The production-shaped integration rerun on clean Open UX Tools commit
`d9d813261b5a8a79761657a9505014c67fc50648` and Open UX OData commit
`64e37ac4a6d24607c28a06242075b95afbbc1ff2` added five fresh-process samples
for every missing local timing. The measured p95 values were 3,437.153 ms for
cold whole-service generation, 25.306 ms for a cache hit without learned
session initialization, 1,308.731 ms for first-use acquisition of all
192,167,584 verified bytes, and 3,438.173 ms for the host provider path. The
final report imports both fingerprinted evidence files, measures 264,636,488
total bytes, and passes every hard footprint gate. Release-platform and BAS
reruns remain required.

**Accepted flag-gated rebind (2026-09-05):** The campaign was repeated against
clean Open UX Tools commit
`c562a5571811b5e7bdab20ef732a6d103fab4fb6` and the accepted Open UX OData host
commit `3556f352d0e4b8f7397bd30748110d2701cf0a1a`. The upstream
multi-platform runtime passes every local quality and latency gate but uses
451,328,075 total installed-and-cache bytes, so its total-footprint gate fails.
The exact 10,195,380-byte `darwin-arm64` runtime archive retains all 233
classifier cases and 16/16 SFT parse/exact-key cases, fills 261/261 fields, and
uses 266,452,329 total bytes. It passes every hard local gate with 48,120,471
bytes of headroom. Its cold, warm-cache, first-acquisition, and host p95 values
are 1,853.041, 23.676, 582.150, and 1,853.872 ms respectively. The reports are
retained under
`/absolute/path/to/mockserver-data-generator-evidence-c562a5571`.
This completes the local rebind; BAS and the supported Node/OS distribution
matrix remain open.

### Task 9.4: Select the Pareto winner

**Files:**

- Create in model repository: `reports/model-runtime-frontier-v1.md`
- Create: `governance/candidate-selection-v1.json`

- [ ] Rank only candidates that pass structural, quality, determinism, latency, and governance gates.
- [ ] Prefer the smallest passing model/runtime pair; if none safely improves on int8, retain int8 and document the negative result.
- [ ] Ensure the selected public package still packs below 5 MiB and total installed/cache footprint remains at most 300 MiB.
- [ ] Record the exact selected artifact hashes and runtime version in the candidate manifest.

**Phase exit gate:** A reproducible Pareto table and signed selection record identify one candidate; WASM has an evidence-backed go/no-go result.

**Implementation record (2026-09-04):** The retained INT8 model plus a
platform-specific native runtime is the only locally passing size/quality pair.
The model archive remains 164,924,986 bytes and intentionally misses the
82,462,493-byte optimization target because every target-sized model failed the
structural gate; the complete 264,636,488-byte product footprint passes the hard
300 MiB ceiling. Selection cannot be signed or promoted until the runtime proof
has an approved upstream or SAP-governed distribution with platform, license,
SBOM, signing, and rollback evidence.

The accepted 2026-09-05 rebind confirms the same decision on the actual
`--mockgen` integration: retain the quality-passing INT8 model, reject WASM,
and reduce the runtime through supported per-platform native packaging. The
local selected pair is not a publishable selection record until that packaging
is maintained and the release-platform matrix passes.

## Phase 10 — Qualify realism and the integrated product

**Outcome:** The exact package/model/runtime candidate is proven structurally safe and realistically useful on unseen applications.

### Task 10.1: Freeze an uncontaminated final inspection cohort

**Files in model repository:**

- Create: `evaluation/final-cohort-v1.jsonl`
- Create: `evaluation/final-cohort-v1-manifest.json`
- Test: `tests/test_final_cohort.py`

- [x] Reuse the existing inspection-cohort structure and selection tooling.
- [x] Replace every service/application family that appears in classifier or SFT training, calibration, development, or model selection.
- [x] Cover at least six application domains and the V2 EDMX, V4 EDMX, and CSN input paths.
- [x] Include at least 300 fields, at least 50 per application family, and at least 50 per schema format.
- [x] Freeze metadata, T2 assignment denominators, `expectedEmpty` declarations, metadata-derived relationship assertions, domain-coherence assertions, selection algorithm, and hashes before running the candidate.

**Implementation record (2026-09-04):** The external `final-cohort-v1`
manifest freezes six service/source-family-disjoint applications, 300 scalar
fields (50 per domain), 150/100/50 fields across EDMX V2/EDMX V4/CSN, and 11
coherence assertions. Its isolation audit is bound to the exact classifier and
SFT train/evaluation inputs plus the pilot model-selection manifest, with zero
service or source-family overlaps. The pilot review prompt/schema and selection
method were reused; the contaminated and under-stratified pilot services were
not reused as the final cohort.

### Task 10.2: Run absolute structural and application-behavior gates

**Files:**

- Create in model repository: `evaluation/structural-report-v1.json`
- Create in `open-ux-tools`: `packages/mockserver-data-generator/test/integration/production-candidate.test.ts`

- [x] Generate the cohort with the exact selected package, provider, model, runtime, configuration, and seed.
- [x] Require 100% known-property, type, nullability, maximum-length, precision/scale, key presence/uniqueness, enum, foreign-key, containment cardinality/shape, and navigation-target validity over every emitted applicable value, row, and edge.
- [x] Require every fixture entity set and exercised child navigation to contain usable data unless its fingerprinted fixture declared `expectedEmpty: true` before candidate execution.
- [x] Require 100% of the predeclared code/text, amount/currency, quantity/unit, date-range, person/address, status, draft, value-help, and metadata-derived relationship assertions to pass.
- [x] Verify existing mock files retain precedence and bytes.
- [x] Replay identical inputs and compare output fingerprints.

**Implementation record (2026-09-04):** Clean package commit
`817382b88f2cd88a84eb093410ad2a3a367b5505` generated 16/16 non-empty
resources with the checksum-verified classifier and INT8 SFT runtime. Package
validation passed every schema and relationship invariant, and the campaign's
executable evaluator passed all 11 frozen coherence assertions. The repeated
311-record evidence file was byte-identical. Its strict learned gate recorded
178/178 parsed responses, 821/846 accepted eligible fields, and contribution
from all six targets. The final evidence fingerprint is
`3b3283cb7d134fc4a26a9b250eac17c06c28847e240691e24f0ee67de7f1c2aa`;
the candidate fingerprint is
`f15bd1de48b5371cd375d286014b06a67b8e2a01f3ade3c2460386897cdb9cc6`.
Existing-data precedence and non-mutation remain covered by the package and
standard-host integration tests. This completes the local structural gate, not
the external realism gate.

### Task 10.3: Reuse the LLM-as-judge harness on the exact candidate

**Files in model repository:**

- Create: `evaluation/judge-request-v1.jsonl`
- Create: `evaluation/judge-provider-a-v1.jsonl`
- Create: `evaluation/judge-provider-b-v1.jsonl`
- Create: `evaluation/judge-consensus-v1.json`
- Create: `evaluation/judge-adjudication-v1.jsonl`

- [ ] Reuse the pilot prompt, schema, provider runner, consensus compiler, and six-domain rubric after versioning and reviewing them.
- [ ] Blind candidate identity and randomize presentation order.
- [ ] Bind every judgment to model, dataset, package/runtime, prompt/rubric, provider, and resolved provider-model fingerprints.
- [ ] Route disagreements and critical flags to a recorded adjudication state.
- [ ] Use targeted expert review for new provider disagreements and any legacy record that fails the approved provenance checks; do not run a redundant blanket human study.
- [ ] Preserve the prior realism report as private historical evidence, not as evidence for the new candidate.

**Realism gate:** At least 80% consensus-realistic overall and in every domain/schema format, zero critical issues, and no coverage gaps.

### Task 10.4: Test degradation as product behavior

**Files:**

- Create: `tests/integration/mockserver-data-generator/src/degradation/provider-degradation.test.ts`
- Create: `docs/quality/mockserver-data-generator-degradation.md`

- [x] Exercise missing model, missing optional runtime, offline first use, corrupt download, checksum mismatch, inference timeout, malformed output, cache corruption, and cancellation.
- [x] Exercise a provider package load failure in the host.
- [x] Require the standard mockserver to start and every required field to resolve through remaining tiers.
- [x] Require a failed model not to retry continuously during the same provider lifecycle and to be eligible on the next lifecycle or process start.
- [x] Require diagnostics to explain degradation without logging metadata or values.

**Phase exit gate:** The exact candidate passes absolute structural gates, fresh dual-provider realism gates, determinism, and all degradation fixtures. A failed gate returns the artifact to candidate status.

## Phase 11 — Keep native CAP outside the approved scope

**Outcome:** CAP metadata remains supported through the existing FE mockserver CDS metadata processor; no native CAP package or persistence integration is added.

- [x] Remove `@sap-ux/mockserver-data-generator-cap` from this branch.
- [x] Remove its workspace, coverage, ownership, lockfile, and changeset entries.
- [x] Require a separate product request and design before any native CAP integration.

**Phase exit gate:** No native CAP adapter files or package references remain.

## Phase 12 — Harden security, compatibility, CI, and operations

**Outcome:** The feature behaves predictably across developer environments and is supportable without external telemetry.

### Task 12.1: Complete the supported platform matrix

**Files:**

- Modify: `.github/workflows/pipeline.yml` only if new focused jobs are required.
- Create: `packages/mockserver-data-generator/test/integration/platform-contract.test.ts`
- Create in model repository: `evaluation/platform-matrix-v1.json`

- [ ] Run Node 22 and 24 on Ubuntu, Windows, and macOS using the repository's existing matrix.
- [ ] Add explicit macOS arm64/x64, Linux x64/BAS, and Windows x64 runtime acquisition/launch evidence.
- [ ] Test paths containing spaces, non-ASCII paths, read-only project directories, corporate proxy, no network, and concurrent starts.
- [ ] Test clean install, add, first start, warm restart, upgrade, downgrade, provider removal, and cache migration.
- [ ] Keep production-model downloads out of the six-way PR matrix; use tiny artifacts there and run full model qualification in the governed pipeline.

**Local portability record (2026-09-04):** The exact fingerprinted development
kit completed a real npm install, provider/HTTP canary, and byte-exact restore
from a Fiori application path and a kit path containing spaces plus non-ASCII
German/Japanese text. A focused integration regression also covers application,
kit, model-manifest, and model-cache paths with those characters. Cross-platform
path syntax, read-only filesystems, corporate proxy behavior, and the full
Node/OS matrix remain release-platform gates. A separate true child-process
regression launches two production package consumers against the same empty
cache and proves one download, two ready results, one verified artifact, and no
remaining lock or partial file. Networked/BAS filesystem semantics remain a
platform gate. FE provider tests also prove that a read-only generated-data
cache emits a stable warning while retaining complete generated
rows; a genuinely read-only project/BAS filesystem still requires the platform
matrix.

**Node 24 macOS arm64 record (2026-09-05):** On macOS 26.7 arm64 with Node
24.20.0, the generator passed 23 suites/196 tests plus build, lint, and exact
package checks; host core passed 27 suites/359 tests/282 snapshots; and the
middleware passed 2 suites/12 tests. The exact fingerprinted development kit
then passed clean deterministic V4 and retained-classifier/SFT V2 installs,
HTTP canaries, and byte-exact restores. This closes only the macOS arm64 Node 24
cell; macOS x64, Linux, Windows, BAS, proxy, and remaining filesystem cases stay
open.

**Local Linux x64 runtime record (2026-09-05):** The source-only release
builder ran inside a Docker `linux/amd64` environment against the exact
`onnxruntime-node@1.24.3` registry package. The Debian 12 Node 22.23.2 and Node
24.20.0 image IDs are recorded in the runtime release procedure. Two builds
produced byte-identical 30-file, 35,625,373-byte runtime trees with fingerprint
`38ca3f2b69edb996190c076ed9607906553851eed987bc1733051a42db2c292d` and
descriptor SHA-256
`7e4c7e0279736f2ab164b7594d2a128197216904645c1e8ceb10bc19341d269f`.
The copied runtime entry executed a real ONNX graph with exact expected output
on Node 22.23.2 and Node 24.20.0. This closes the local Linux x64 runtime
selection and ABI smoke. The exact current development kit also installed into
fresh OData V4 fixtures in the Node 22.23.2 and Node 24.20.0 Linux x64
containers: separate standard and deterministic HTTP canaries returned rows,
the retained classifier and SFT verified and executed with
`learnedRuntimeVerified: true`, and both transactional restores returned the
fixture byte-for-byte outside disposable `node_modules`. Docker amd64 emulation
on macOS is not native Linux performance, hosted acquisition, BAS,
proxy/certificate, or filesystem evidence, so the corresponding full platform
checkbox remains open.

**Clean Linux x64 source-package record (2026-09-05):** A clean `git archive`
snapshot at `25eab872ca45a1e0e1e8a26d421e0e7dc24f3608` (generator product code
unchanged from `3af20f0d4f7e2e42c45819ed52af33aec4beb971`) was installed from the
frozen workspace lock in Docker `linux/amd64`. On Node 22.23.2 and Node
24.20.0, the package independently passed `tsc --build`, all 30 suites and 289
tests including the real native-runtime contract, zero-error ESLint, and the
exact package-boundary command. Both package checks reported 76 files, 101,068
bytes, a 5 MiB ceiling, and a network-free core profile. The source run and the
exact packed-application canaries together close the local emulated Linux x64
functional cells. They do not close native Ubuntu CI, Windows, macOS x64, BAS,
proxy/certificate, filesystem, acquisition-hosting, or native performance
cells, so the six-way platform checkbox remains open.

### Task 12.2: Perform threat modeling and dependency review

**Files:**

- Create: `packages/mockserver-data-generator/docs/security.md`
- Create: `packages/mockserver-data-generator/test/security/path-and-manifest.test.ts`
- Create in model repository: `governance/model-supply-chain-review-v1.md`

- [x] Threat-model metadata parsing, path traversal, arbitrary module loading, model download, archive extraction, cache poisoning, lock attacks, prompt leakage, model provenance, and resource exhaustion.
- [x] Allow only the configured provider module and validated model-manifest files; never execute downloaded model-side code.
- [x] Reject EDMX/CSN above a fixed 32 MiB UTF-8 ceiling before hashing or parsing, with stable FE fallback diagnostics.
- [x] Enforce download size, generation time, row count, memory-aware concurrency, and output-size limits.
- [x] Run production dependency audit and record inherited upstream findings separately.
- [ ] Produce or consume SBOM/provenance for npm and model artifacts according to SAP release policy.

### Task 12.3: Finalize privacy-safe diagnostics and support workflow

**Files:**

- Modify: `packages/mockserver-data-generator/src/diagnostics.ts`
- Create: `packages/mockserver-data-generator/docs/troubleshooting.md`
- Create: `packages/mockserver-data-generator/test/unit/diagnostics-redaction.test.ts`

- [x] Emit local component state, fingerprints, timing, counts, tier share, cache state, and stable error codes.
- [x] Redact absolute paths where unnecessary and prohibit raw metadata, prompts, source rows, and generated values.
- [x] Keep external telemetry disabled; any future telemetry requires a separate privacy-reviewed design.
- [x] Document cache inspection, forced regeneration, offline preparation, model pin/rollback, and provider disablement.

### Task 12.4: Run focused and full repository gates

**Focused verification:**

```bash
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm --filter @sap-ux/mockserver-data-generator lint
pnpm --filter @sap-ux/mockserver-data-generator test
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests build
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests lint
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests test
pnpm lint:dependency-versions
pnpm validate:changesets
```

**Full verification:**

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm test --tuiAutoExit
pnpm test:integration
pnpm audit --prod
pnpm changeset status
```

- [x] Run all focused commands after each owning package phase.
- [ ] Run all full commands before each preview/stable release PR.
- [x] Do not fix unrelated failures inside feature commits; record them with upstream SHA and independent reproduction.
- [x] Require at least 80% coverage and full coverage of security/precedence/fallback branches in the new packages.

**Phase exit gate:** Supported platform, install, security, audit, coverage, package-boundary, and repository gates pass or have an approved, pre-existing upstream exception unrelated to the feature.

## Phase 13 — Release preview, promote safely, and retire the pilot

**Outcome:** Users receive an opt-in, reversible release backed by exact package/model evidence; the pilot is preserved until stable parity is proven.

### Task 13.1: Publish immutable candidate artifacts

**Files:**

- Finalize all package changesets.
- Create in model repository: `attestations/candidate-v1.json`
- Create in model distribution: immutable candidate bundle and model card.

- [ ] Publish the `open-ux-odata` SPI prerelease first.
- [ ] Publish `@sap-ux/mockserver-data-generator@0.1.0` preview from the packed, tested artifact.
- [ ] Bind dataset/split, training code, base model, exported artifact, runtime, structural report, performance report, judge report, and legal/privacy approvals in one attestation.
- [ ] Verify public npm tarballs and model artifacts after publication, not only local build outputs.

### Task 13.2: Run a controlled canary

**Files:**

- Create in model repository: `release/canary-plan-v1.md`
- Create: `release/canary-results-v1.json`

- [ ] Install published artifacts into clean V2, V4, and CDS-through-FE fixtures.
- [ ] Run online first use, offline second use, corrupt-model fallback, previous-model pin, and provider disablement.
- [ ] Run a representative real-app canary without using the deferred finance bug as a blocker.
- [ ] Capture package/model/runtime fingerprints and diagnostics for every result.
- [ ] Keep the feature opt-in throughout preview.

### Task 13.3: Prove rollback and promotion mechanics

**Files:**

- Create in model repository: `release/rollback-test-v1.json`
- Update: channel manifest for candidate/preview/stable states.

- [ ] Retain current and previous promoted immutable bundles.
- [ ] Test channel rollback to N-1 and T2 kill switch behavior.
- [ ] Make withdrawn versions unavailable for new automatic selection while allowing pinned forensic reproduction.
- [ ] Invalidate generated-data cache on model fingerprint change.
- [ ] Define rollback triggers: app blanking, supply-chain failure, structural validity below 100%, realism below 80%, material latency/footprint regression, corruption, or nondeterminism.

### Task 13.4: Publish production documentation

**Files:**

- Modify: `packages/mockserver-data-generator/README.md`
- Modify: `packages/mockserver-data-generator/docs/architecture.md`
- Modify: `packages/mockserver-data-generator/docs/host-contract.md`
- Modify: `packages/mockserver-data-generator/docs/security.md`
- Modify: `packages/mockserver-data-generator/docs/troubleshooting.md`

- [x] Document opt-in setup, one-middleware configuration, model acquisition, offline preparation, deterministic seed, existing-data precedence, cache behavior, diagnostics, and rollback.
- [x] State preview limitations and English-first scope.
- [x] Distinguish structural validity, classifier metrics, LLM parse/fill metrics, and realism evidence.
- [x] Credit the pilot as evidence without exposing internal/customer artifacts.

**Implementation record (2026-09-05):** The package now publishes architecture,
host-contract, troubleshooting, and security guidance from its npm boundary.
The exact packed-archive checker requires those operational documents and
rejects inline relative Markdown links that do not resolve to regular files
inside the extracted package. Contract tests also require the security guide,
honest English-first claim boundaries, and the implemented `rowsPerEntity`
option.
Downloader regressions prove that manifest-controlled descendant symlinks and
insecure redirect hops are rejected before external writes or redirected-host
contact. Actual npm publication remains part of Task 13.1.

### Task 13.5: Promote stable and archive the pilot only after parity

- [ ] Compare the stable candidate against all pilot behaviors in `docs/pilot-parity.md`.
- [ ] Require package, model, size, runtime, security, real-app, fresh judge, and rollback attestations.
- [ ] Promote the immutable model through a channel-manifest change.
- [ ] Verify the live npm metadata/tarballs and model manifest/hashes.
- [ ] Mark the pilot read-only only after stable users can install and run the production path.
- [ ] Preserve its governed evidence and rejected experiments; do not delete the pilot or its only artifact copies.

**Final exit gate:** The standard mockserver starts through the existing command with standard generation by default; the same command plus `--mockgen` produces realistic and structurally valid missing data, preserves hand-authored data, survives all optional-model failures, stays within release budgets, passes fresh fingerprint-bound realism evaluation, and has a tested rollback path.

## Definition of done

- [ ] No production package or documentation uses `@mockgen/*`, `start-mockgen`, or `ui5-mockgen.yaml`.
- [ ] Only `sap-fe-mockserver` serves FE mock data.
- [ ] `npm run start-mock` is behaviorally standard and performs no MockGen generation, model, cache, or network work; `npm run start-mock -- --mockgen` is the sole supported runtime opt-in.
- [ ] `@sap-ux/mockserver-data-generator` and the host SPI have published compatibility tests.
- [ ] OData V2, OData V4, and CDS-through-FE fixtures pass.
- [ ] Existing mock files always win and remain unchanged.
- [ ] No model/runtime/network/cache failure blanks the application.
- [ ] npm is at most 5 MiB packed and contains no learned artifacts.
- [ ] Model, runtime, cache, transfer, latency, and memory sizes are independently reported and meet the approved budgets.
- [ ] Existing datasets and judge infrastructure are reused after governance and split repair.
- [ ] The exact promoted candidate passes 100% structural validity and at least 80% dual-provider realism overall and per domain/format.
- [ ] WASM has an explicit evidence-backed go/no-go decision.
- [ ] The packed local/BAS dev kit can install, verify, upgrade, and restore an existing generated Fiori elements application without registry access to unpublished packages or a path back to either source checkout.
- [ ] Every release artifact is immutable, hashed, attributable, rollback-tested, and verified after publication.

## Implementation handoff

Implement the deterministic, classifier, and SFT paths test-first using the existing pilot as the behavioral and evidence baseline. Use the packed development kit continuously for manual local and BAS canaries. Standard pull-request review precedes merge, and model provenance plus hosted-artifact checks precede publication; neither is an unresolved architecture question. Request code review at every repository boundary and before each preview/stable publication.

## Reviewed implementation checkpoint (2026-09-05)

**Zero-setup app-wiring amendment:** The manager-approved production flow
supersedes the earlier requirement that `packages/mockserver-config-writer`
remain byte-identical. The writer is now the narrow bootstrap owner: it adds the
lightweight npm dependency, the inactive provider block, and the launcher while
preserving standard unflagged startup. The focused implementation and
verification steps are tracked in
`docs/superpowers/plans/2026-09-05-mockgen-zero-setup-app-wiring.md`. Automatic
first-use acquisition of the approved model and native runtime remains the next
production implementation slice; it is not part of the application wiring
change.

The approved runtime behavior is implemented on clean candidate commits
`59a448414c9e601a42a3d18a23bc1c892dc0894f` in `SAP/open-ux-tools` and
`b64ee8b60519f129ad975465536204c78a15be1a` in `SAP/open-ux-odata`.
`npm run start-mock` remains standard and does not invoke MockGen;
`npm run start-mock -- --mockgen` is the explicit opt-in. The launcher
preserves generated application behavior and forwards ordinary child
arguments, while the generic host creates and disposes one provider per
generation epoch and retains complete fallback behavior.

The final focused review found no remaining critical or important issue in the
launcher and lifecycle scope. Current local verification includes 251 generator
tests, 364 host-core tests, 13 middleware tests, and 120 development-kit tests,
plus clean builds and zero-error lint for the affected packages. The preceding
compatibility archive passed fresh packed OData V2, OData V4, and CDS-through-FE
applications on both standard and learned HTTP paths. The current archive
repeated standard, deterministic MockGen, and retained-classifier/SFT checks in
a fresh V4 fixture.

The reproducible local/BAS kit is
`/absolute/path/to/mockserver-data-generator-dev-kit-dc912317987aed27.tgz`
(566,654 bytes, SHA-256
`29a5b6918a00bce92c0fda9167820d3e28a3958596ce679122cf201d8afda23f`).
The reviewed platform-runtime campaign passes every hard local gate at
266,453,893 installed-and-cache bytes. The 451,328,075-byte upstream result is
the prior exact multi-platform baseline and still fails only the total-footprint
gate. WASM remains a measured no-go.

Local implementation and handoff packaging are complete. The next bounded
step is the actual BAS canary. Supported per-platform runtime distribution,
remaining Node/OS cells, model/data approvals, independent realism review,
publication, and rollback verification remain release gates rather than local
implementation gaps.

**Native-runtime matrix increment (2026-09-05):** A package contract now loads
the real `onnxruntime-node@1.24.3` native addon and executes a tiny ONNX graph in
a normal child process. Both public MockGen backend adapters create native
sessions, delegate session work, and map the package's `dispose()` lifecycle to
ONNX Runtime's actual `release()` API. A valid inference after disposal must
fail as already disposed, so a no-op cleanup cannot satisfy the contract. The
complete 27-suite/236-test package, build, and zero-error lint pass on macOS
arm64 with Node 22.22.3 and Node 24.20.0. Because the repository pipeline
already runs the package suite on Ubuntu, Windows, and macOS with both Node
lines, the same contract will become six-cell evidence once the branch is
pushed and CI runs. The current upstream Node package has no documented
platform-specific npm-package family, so no consumer-package pruning or private
runtime name was added. BAS and remote CI execution remain open.

The exact clean kit for this increment is fingerprint
`5b5c476ba56a79da923278d4a43f7454505fccea9651559230121ba519a1ed94`.
It reproduced byte-for-byte twice and passed V2, V4, and CDS standard and
`--mockgen` canaries on Node 22.22.3, including verified retained classifier and
INT8 SFT execution plus transactional restore. The frozen model-quality
campaign was not repeated for this cleanup-only change; its prior
fingerprint-bound report remains the quality evidence rather than being
mislabelled as a fresh run.

**Input and result boundary increment (2026-09-05):** The accepted host has an
application-level regression for a provider result above 64 MiB, proving that
the result is rejected before publication while application readiness and
built-in mock rows remain available. Metadata evidence is compositional: actual
MockGen package tests prove the 32 MiB UTF-8 ceiling and stable
`METADATA_INPUT_TOO_LARGE` rejection, while a separate host application test
uses a contract-compatible provider reporting that failure to prove bounded,
privacy-safe standard fallback. The full host-core suite passes 27 suites, 364
tests, and 282 snapshots on both Node 22.22.3 and Node 24.20.0, together with
build and zero-error lint. This closes both local boundary gates without
misstating the separate repository test layers as one cross-repository test.

**Host compatibility increment (2026-09-05):** The host core now owns
`MOCK_DATA_GENERATOR_API_VERSION = 1`, and the callable CommonJS middleware
export advertises that capability. The generator launcher resolves the fixed
middleware package from the application only for `--mockgen`, rejects a
missing, unloadable, or wrong-version host before child-process creation with a
stable path-free message, and leaves unflagged startup untouched. Test-first
verification observed the intended failures before implementation and now
passes 29 suites/251 tests for the generator, 27 suites/364 tests for the host
core, and 2 suites/13 tests for the middleware on both Node 22.22.3 and Node
24.20.0; all affected builds and lints pass with zero errors. The 11-suite,
120-test development-kit integration package also passes. Independent re-review
found no remaining critical, important, or minor issue in this scope.

**Deterministic disablement increment (2026-09-05):** A test-first public API
regression exposed that `mode: deterministic` skipped classifier and SFT calls
but still reported both supplied runtime components as ready and included their
fingerprints. The generator now removes the suppressed runtime from capability
and fingerprint reporting as well as execution. Both supported Node lines pass
29 suites/251 tests, build, and zero-error lint; the 11-suite/120-test
cross-repository integration package and the 95,117-byte package boundary also
pass. This provides an honest local all-learned-tier disablement control. The
separate remote model-channel N-1 and T2-only kill-switch canary remain release
gates.

The exact clean kit for the deterministic-reporting increment is fingerprint
`dc912317987aed2762cf60c4633a2f0a2c292ffb4ca7d9f0dde10eaa2e7f0b32`,
566,654 bytes, with SHA-256
`29a5b6918a00bce92c0fda9167820d3e28a3958596ce679122cf201d8afda23f`.
Two builds were byte-identical. A fresh OData V4 application passed separate
standard and deterministic `--mockgen` canaries on Node 22.22.3; a second clean
installation verified and executed the retained classifier and INT8 SFT model
through the same exact archive. Both transactional restores were byte-exact
outside disposable `node_modules`. The preceding compatibility archive remains
the fresh V2/V4/CDS cross-format evidence. Exact minimum npm versions remain
intentionally unset until the host packages are actually released.

**Automatic release-model acquisition increment (2026-09-05):** Commit
`0eb3822d08c03863b6f10075c626ed8624e90bf2` makes a flagged launcher resolve
the immutable manifest owned by its package release, verify the default SAP
tools cache, acquire missing classifier/SFT artifacts under a five-minute
deadline, and pass only verified cache paths to the provider in offline mode.
Warm cache use bypasses acquisition, inherited private model-path variables are
removed, and any preparation failure emits one path-free warning before Fiori
starts with deterministic MockGen tiers. Normal application YAML has no model
or cache paths. The optional `prepare` and `verify` commands use the package
manifest and default cache without path arguments while retaining explicit
development/provisioning overrides.

The unpublished `0.0.0` source intentionally contains no invented public model
location. A package-boundary check prevents any publishable version from being
packed without `resources/model-manifest.json`; model weights remain excluded.
The package passes 30 suites/260 tests, build, zero-error lint, changeset
validation, and the 97,960-byte package boundary. The cross-repository
development-kit package passes 11 suites/120 tests, build, and zero-error lint.
These checks do not close the approved hosted-bundle, platform-specific native
runtime distribution, actual BAS canary, or publication/rollback gates. WASM
remains the measured no-go rather than an assumed solution to the runtime
distribution gap.

**Release-acquisition review hardening (2026-09-05):** Independent review of
the automatic first-use path found boundary issues in two passes. Commits
`8baa2500b` and `1d81c4880` make launcher-prepared cache-only state override
legacy YAML model paths, explicitly suppress legacy online model configuration
after acquisition failure, remove private activation and model-state variables
case-insensitively before spawning Fiori on Windows, and apply one deadline to
manifest reading, cache hashing, download, and final verification. They also
replace the broad published-resources rule with an exact allowlist for
`resources/model-manifest.json`, including case-insensitive directory detection
while retaining one case-exact allowed member. Regression tests cover each
case, including renamed, nested, and mixed-case resource files. The package
passes 30 suites/268 tests, build, zero-error lint, changeset validation, and
the 98,334-byte package boundary. The development-kit integration package
passes 11 suites/120 tests, build, and zero-error lint. Public model hosting,
supported per-platform native runtime delivery, the actual BAS canary, and npm
publication remain release work rather than completed local evidence.

**Platform-runtime acquisition increment (2026-09-05):** Commit
`6c05dc7f0558bf628edbf90538e686870d1c2c9c` completes the package side of the
approved small-runtime design. Release-manifest format 2 binds an exact
`onnxruntime-node` version and immutable, hashed file set to each supported
`darwin-arm64`, `darwin-x64`, `linux-x64`, and `win32-x64` target. A flagged
first start downloads only the current target together with missing model
files, publishes nothing before complete verification, and makes a warm start
network-free. The verified cache entry is loaded directly; a format-2 release
never falls back to an application-installed all-platform runtime. Format 1 is
retained only for the unpublished development kit.

The package now has no production or peer dependency on
`onnxruntime-node`; the exact version remains a development dependency for the
native matrix contract. On macOS arm64, the test stages a normal
platform-specific runtime tree, imports its copied entry in a clean child
process, executes a real ONNX graph, and verifies the 36,783,485-byte tree is
below the 64 MiB runtime ceiling. Downloader tests also prove that a verified
partial current-platform runtime is reused, only its missing file is fetched,
and an alternative platform is not contacted. The complete
30-suite/289-test package passes on Node 22.22.3 and Node 24.20.0; the focused
native/acquisition contracts were rerun after their final test hardening.
Build, zero-error lint, the
101,068-byte package boundary, changeset status, and the 11-suite/120-test
cross-repository integration package pass. Approved hosted runtime files,
license/SBOM/signing attestations, remote platform execution, and public model
hosting remain release gates; this commit does not invent or publish them.

**Platform-runtime release builder (2026-09-05):** Commits `aac0e3139` and
`ffdb7d6a4` add the source-only builder that turns the exact installed
`onnxruntime-node@1.24.3` dependency into the current OS/CPU format-2 runtime
descriptor and file tree. The builder accepts only the four supported targets,
credential-free immutable HTTPS artifact and SBOM URLs, and a new absolute
output directory. It rejects links and unsupported filesystem entries, copies
files without overwrite, hashes files with bounded streaming memory, enforces
the 64 MiB ceiling, and never uploads or publishes an artifact. Two builds on
macOS arm64 produced the same 30-file descriptor and
`e43288a91114ae6ba8b1b7d0ab95d00d50c6e7fb8a18f4ab7150c74bcf7f270a`
fingerprint; the 36,280,317-byte closure imports from its copied entry and runs
a real ONNX graph. The full package remains at 30 suites/289 tests on Node
22.22.2 and Node 24.20.0, the 101,068-byte package boundary passes, and the
11-suite/120-test integration package passes. The exact release procedure is
recorded in
`docs/quality/mockserver-data-generator-runtime-release.md`; target-platform
execution, approval, hosting, signing, and publication remain open gates.

**Explicit host-artifact development-kit increment (2026-09-05):** Commit
`3af20f0d4` closes the remaining package-input branch in Task 6A.1. The
development-kit builder now accepts either the matching `SAP/open-ux-odata`
worktree or an explicit core/middleware tarball pair plus the exact source
commit used to build them. It inspects and checksum-binds the copied archives,
rejects incomplete modes, and requires the middleware's exact core dependency
to equal the supplied core package version. Argument validation remains free of
Git and filesystem side effects.

The 11-suite/123-test integration package passes on Node 22.22.2 and Node
24.20.0, together with build and zero-error lint. A real-tarball canary using
the current host packages produced a valid 10-entry archive. The clean
worktree-mode BAS candidate reproduced byte-for-byte twice at 573,682 bytes,
with fingerprint
`d5cb0da4ac7c25fef9929238902b47e2aea492ea7278b96fcfd3614eddbd0ce2`
and SHA-256
`67955d9fe14cd0c1872860c1be3e0f4b6d2e654b766e18638aa3d7931708c250`.
This is reproducibility and input-compatibility evidence, not an actual BAS
execution result.
