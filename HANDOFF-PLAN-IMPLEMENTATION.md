# MockGen Semantic-Planner Handoff

Date: 2026-09-09

Historical handoff: the implementation and verification continued on 2026-09-10.
Use the implementation checkpoint in `PLAN.md` for current completion and blockers;
the claims and test counts below describe the earlier handoff, not current readiness.

## Purpose

This document hands off the current implementation state for `PLAN.md` to another coding agent. It records what was implemented, where it lives, what was verified, what remains incomplete, and the exact risks that must be resolved before promotion or commit.

The work was intentionally left uncommitted. Semantic-v2 remains shadow-only. The legacy pipeline remains the default and rollback path.

## Repository Boundaries

The work spans two repositories:

- Generator repository:
  `/Users/I335123/SAPDevelop/Projects/open-ux-tools-mockserver-data-generator`
- SPI/host repository:
  `/Users/I335123/SAPDevelop/Projects/open-ux-odata-mock-data-generator-spi`

No changes were made in:

- `/Users/I335123/SAPDevelop/Projects/open-ux-tools`

Do not merge or commit the generator and SPI changes as though they belong to one Git repository. They require separate review and likely separate changesets.

## Worktree State

Direct status verification showed these uncommitted changes.

### Generator repository

Modified tracked files include:

- `package.json`
- `packages/mockserver-data-generator/src/fe-mockserver.cts`
- `packages/mockserver-data-generator/src/generation/deterministic.ts`
- `packages/mockserver-data-generator/src/generation/sft.ts`
- `packages/mockserver-data-generator/src/index.ts`
- `packages/mockserver-data-generator/src/model/embedding-classifier.ts`
- `packages/mockserver-data-generator/src/model/sft-runtime.ts`
- `packages/mockserver-data-generator/src/schema/csn.ts`
- `packages/mockserver-data-generator/src/schema/edmx.ts`
- `packages/mockserver-data-generator/src/schema/graph.ts`
- `packages/mockserver-data-generator/src/semantics/classifier.ts`
- `packages/mockserver-data-generator/src/semantics/lexical-fallback.ts`
- `packages/mockserver-data-generator/src/semantics/value-banks.ts`
- `packages/mockserver-data-generator/src/types.ts`
- Multiple existing unit tests

New untracked files include:

- `PLAN.md` supplied by the user
- `packages/mockserver-data-generator/src/generation/service-world.ts`
- `packages/mockserver-data-generator/src/inspection.ts`
- `packages/mockserver-data-generator/src/semantics/field-context.ts`
- `packages/mockserver-data-generator/src/semantics/role-registry.ts`
- `packages/mockserver-data-generator/test/unit/finance-manage.metadata.xml`
- `packages/mockserver-data-generator/test/unit/schema-ir.test.ts`
- `packages/mockserver-data-generator/test/unit/semantic-planner.test.ts`
- `scripts/mockserver-data-generator-evaluation/capture-app.mjs`
- `scripts/mockserver-data-generator-evaluation/capture-app.test.mjs`
- `scripts/mockserver-data-generator-evaluation/lib/capture-app.mjs`
- This handoff file

### SPI repository

Modified tracked files include:

- `packages/fe-mockserver-core/src/api.ts`
- `packages/fe-mockserver-core/src/data/entitySets/entitySet.ts`
- `packages/fe-mockserver-core/src/data/serviceRegistry.ts`
- `packages/fe-mockserver-core/src/mockDataGenerator.ts`
- `packages/fe-mockserver-core/test/unit/mockDataGenerator.test.ts`
- `packages/ui5-middleware-fe-mockserver/src/configResolver.ts`
- `packages/ui5-middleware-fe-mockserver/test/configResolver.test.ts`

No commit was created in either repository.

## Implemented Plan Areas

### 1. Host empty JSON ownership

Implemented in the SPI repository.

Added:

```ts
generateForEmptyJson?: readonly string[]
```

Behavior implemented:

- Names are exact and case-sensitive.
- Only regular JSON files whose parsed value is exactly `[]` become provider targets.
- Non-empty JSON remains authoritative.
- Contributors remain authoritative.
- Successful generated resources replace allowlisted empty JSON at publication time.
- Provider failure retains the original empty JSON.
- Unknown configured names produce a bounded warning.
- Application files are not rewritten.
- SPI contract version remains `1`.
- Provider-visible `existingData` treats an allowlisted empty resource as effectively missing while host-side prepared data retains the original source for fallback.

Relevant SPI files:

- `packages/fe-mockserver-core/src/api.ts`
- `packages/fe-mockserver-core/src/mockDataGenerator.ts`
- `packages/fe-mockserver-core/src/data/serviceRegistry.ts`
- `packages/fe-mockserver-core/src/data/entitySets/entitySet.ts`
- `packages/ui5-middleware-fe-mockserver/src/configResolver.ts`
- `packages/fe-mockserver-core/test/unit/mockDataGenerator.test.ts`
- `packages/ui5-middleware-fe-mockserver/test/configResolver.test.ts`

Focused validation:

- Host contract suite: `31/31` passed.
- Middleware config suite: `7/7` passed.
- Live OData test covers:
  - default empty preservation
  - allowlisted replacement
  - provider-visible missing ownership
  - unknown target warning
  - provider failure fallback

### 2. Inspection API and diagnostics

Implemented in the generator repository.

Added exported API:

```ts
inspectService(
  request,
  options,
  runtime,
  inspectionOptions
): Promise<MockDataGeneratorInspectionV1>
```

Inspection includes:

- version and pipeline
- request and metadata hashes
- source ownership
- target eligibility
- authored row count and authored row hashes
- raw classifier candidates
- accepted roles
- abstention reasons
- provider state
- rejected candidates
- relationship provenance and confidence
- unsupported schema elements
- generators used
- generated resource summaries and hashes
- optional generated rows
- diagnostics
- phase timings
- RSS before and after
- registry, catalog, serializer, model, and request fingerprints

Generated values are only exposed when:

```ts
{ includeGeneratedValues: true }
```

Normal inspection represents authored values with hashes/counts rather than raw values.

Relevant files:

- `packages/mockserver-data-generator/src/inspection.ts`
- `packages/mockserver-data-generator/src/types.ts`
- `packages/mockserver-data-generator/src/index.ts`
- `packages/mockserver-data-generator/test/unit/api.test.ts`

The API test for exact generation decisions passes.

### 3. Capture harness

Added a repository-local command:

```bash
pnpm mockgen:capture-app \
  --app <dir> \
  --config <yaml> \
  --pipeline legacy,semantic-v2 \
  --output <dir>
```

Implementation files:

- `scripts/mockserver-data-generator-evaluation/capture-app.mjs`
- `scripts/mockserver-data-generator-evaluation/lib/capture-app.mjs`
- `scripts/mockserver-data-generator-evaluation/capture-app.test.mjs`

Behavior:

- Parses `server.customMiddleware` and locates `sap-fe-mockserver`.
- Reads configured services.
- Loads metadata and authored JSON/contributor ownership.
- Runs `source-precedence` and `generator-only` scenarios.
- Runs each requested pipeline.
- Writes reports atomically.
- Refuses an output directory inside the application directory.
- Does not modify the source app.
- Includes generated values only because capture explicitly requests them.

The capture harness unit test passes: `1/1`.

### 4. Rich schema IR

Implemented additively so existing scalar generation continues to work.

Added graph support for:

- declared scalar EDMX type
- complex type definitions
- collection properties
- complex properties
- navigation cardinality
- containment
- partner
- relationship provenance
- relationship confidence
- text links
- unit links
- currency links
- value-list collection paths
- value-list local/value-list property mappings

Relevant files:

- `packages/mockserver-data-generator/src/schema/graph.ts`
- `packages/mockserver-data-generator/src/schema/edmx.ts`
- `packages/mockserver-data-generator/src/schema/csn.ts`
- `packages/mockserver-data-generator/test/unit/schema-ir.test.ts`

The rich schema test passes.

### 5. Relationship inference

Implemented conservative V4 inference:

- exact target business-key names
- exact primitive-type compatibility
- ambiguity abstention
- draft machinery exclusion
- relationship provenance marked as `inferred`
- explicit relationships marked as `explicit`
- generation-oriented relationship normalization
- inferred reverse-edge deduplication against explicit relationships

The supplied finance metadata was extracted without modification from:

```text
/Users/I335123/Downloads/fin.cash.bank.manage-main (3).zip
```

Archive SHA-256:

```text
9ae2b7a4ea9a2d54364b5ad3149dd95345d44c8c846cfbe921866f4843ad5e68
```

Committed fixture SHA-256:

```text
bed9c40cdaee6d6abfb4ec1948ed6b1b4deebd9b3f42c579c654a2d726483e1e
```

Finance relationship acceptance currently verifies:

- 17 entities
- 16 explicit property mappings
- 10 inferred property mappings
- 26 total property mappings

Relevant test:

- `packages/mockserver-data-generator/test/unit/edmx-relationships.test.ts`

### 6. Semantic role registry and arbitration

Added:

- `SEMANTIC_ROLE_REGISTRY` as the source of truth
- provider declaration
- compatible primitive types
- key policy
- validator category
- coherence group
- SFT eligibility
- lexical precision gate
- calibrated route threshold
- calibrated conflict threshold
- finite key cardinality where known
- registry fingerprint

Relevant file:

- `packages/mockserver-data-generator/src/semantics/role-registry.ts`

Semantic-v2 arbitration now handles:

- metadata roles
- classifier roles
- lexical candidates
- classifier/lexical agreement
- conflicting candidates
- unknown and `REVIEW_ME`
- incompatible types
- key-policy violations
- lexical precision gates
- unsupported roles
- explicit abstention reasons

Legacy precedence remains available through the original resolver.

### 7. FieldContextV3 and classifier runtime

Added:

- `FieldContextV3`
- canonical serializer
- serializer fingerprint
- v3 model-head contract validation
- registered-label validation
- 64-token contract
- encoder hash validation
- registry fingerprint validation
- abstention-label validation
- role/family calibration validation
- ordered embedding batches
- deduplicated embedding cache

Relevant files:

- `packages/mockserver-data-generator/src/semantics/field-context.ts`
- `packages/mockserver-data-generator/src/semantics/classifier.ts`
- `packages/mockserver-data-generator/src/model/embedding-classifier.ts`
- `packages/mockserver-data-generator/src/types.ts`

Legacy v1/v2 classifier behavior remains supported.

### 8. Semantic service-world finalization

Semantic-v2 finalization now performs:

- relationship-protected coherence
- relationship-oriented generation edges
- authored value-list projection
- protection of both source and target relationship properties
- temporal creation/change ordering
- conservative derived child-domain inference
- exact shared-key child alignment
- parent child-count derivation
- `Has*` derivation
- finalized country-key catalog reprojection
- bank/country/name/BIC/phone tuple coherence
- final relationship validation
- final generated-result validation

Relevant file:

- `packages/mockserver-data-generator/src/generation/service-world.ts`

The complete semantic planner suite currently passes:

```text
13 tests passed
```

### 9. SFT v2

Added semantic-v2 SFT behavior:

- no Travel/Booking prompt
- real service path
- real entity context
- locale
- fixed deterministic row
- sibling group
- accepted roles
- descriptions
- allowed domains
- narrative-only eligibility
- atomic sibling-group validation
- full-group rollback on invalid output

Legacy SFT prompt/chunk behavior remains unchanged.

Relevant files:

- `packages/mockserver-data-generator/src/model/sft-runtime.ts`
- `packages/mockserver-data-generator/src/generation/sft.ts`
- `packages/mockserver-data-generator/test/unit/sft-runtime.test.ts`

SFT runtime suite currently passes:

```text
13 tests passed
```

## Latest Validation Evidence

The latest focused generator checks passed:

```text
pnpm --filter @sap-ux/mockserver-data-generator build
```

Result: passed.

Combined focused suites:

```text
schema IR
EDMX relationships
embedding classifier
semantic planner
```

Result:

```text
4 suites passed
28 tests passed
```

The full finance capture was successfully produced at:

```text
/tmp/mockgen-finance-capture-output-10
```

Expected files are present:

```text
capture-summary.json
service-1.generator-only.legacy.json
service-1.generator-only.semantic-v2.json
service-1.source-precedence.legacy.json
service-1.source-precedence.semantic-v2.json
```

The capture was performed against the verified finance app extraction and uses both `legacy` and `semantic-v2` pipelines.

## Finance Evaluation State

An earlier aggregate evaluation showed the following before the latest tuple, child-domain, lexical, and target-protection fixes:

- generator-only coverage: 17 resources and 85 rows for both pipelines
- legacy accepted roles: 307/402
- semantic-v2 accepted roles: 96/402
- both pipelines passed machine invariants
- semantic-v2 had approximately 21 ms additional generation time in that run
- semantic-v2 RSS was approximately 3% higher in that run

Those metrics are stale relative to the latest fixes. The next agent must rerun capture and evaluation into a fresh directory before making a quality or promotion judgment.

A temporary evaluator exists only under `/tmp` and is not part of the repository. It checks aggregate criteria including:

- all 17 entity sets
- machine invariants
- BIC syntax
- bank key versus BIC separation
- bank tuple coherence
- country/name coherence
- phone/country coherence
- region/country coherence
- full-name shape
- temporal ordering
- value-list projection
- child counts

Do not treat the old evaluator output as final acceptance evidence.

## Known Remaining Gaps

### Promotion gates are not met

The plan requires, but this work does not yet provide:

- 30 human-reviewed examples per routed role
- three independent service clusters per role
- train/calibration/development/sealed-test partitioning
- routed precision/recall/F1 reports
- 95% Wilson lower-bound precision gate
- OOD false-route rate gate
- 18 sealed services across six domains
- three fixed seeds across the sealed set
- paired service-level bootstrap confidence interval
- blinded realism reviews
- human adjudication
- critical-defect adjudication

Therefore:

- keep `legacy` as the default
- keep `semantic-v2` opt-in/shadow-only
- do not set `realismReady=true`
- do not remove the legacy rollback path
- do not claim semantic-v2 is promotion-ready

### Capture evaluator integration

The existing realism helpers are in:

```text
scripts/mockserver-data-generator-evaluation/lib/realism-cohort.mjs
```

They cover:

- amount/currency
- quantity/unit
- date ranges
- code/text
- person/address
- lifecycle/status
- draft
- value help

There is not yet a committed evaluator that consumes the capture report envelope. A likely next file is:

```text
scripts/mockserver-data-generator-evaluation/evaluate-capture.mjs
```

It should reuse the existing validators and add finance-specific checks for:

- country/name/region
- phone-country
- bank name/BIC/country
- bank key versus BIC
- full names
- child counts and `Has*`
- relationship mappings
- temporal ordering
- value-list projection

It should emit a versioned JSON report without printing row values by default.

### Full quality gates not yet run

The following remain outstanding:

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm lint:dependency-versions
pnpm audit
pnpm test:integration
```

The generator package build and focused tests pass, but this is not equivalent to all monorepo gates.

The SPI repository also needs its own package build, lint, tests, dependency checks, audit, and integration gates.

### Changesets and documentation

No changesets have been added.

The plan requires `FEAT:` changesets for affected source packages and any validator-required cascades.

Documentation still needs updates for:

- `inspectService()`
- `MockDataGeneratorInspectionV1`
- `pipeline: 'legacy' | 'semantic-v2'`
- `generateForEmptyJson`
- capture command
- report privacy guarantees
- semantic-v2 shadow rollout
- rollback behavior

## Recommended Next-Agent Sequence

1. Verify both worktree statuses directly.
2. Run the generator package API suite after the latest finalization changes.
3. Run the SPI host focused suites and build.
4. Run a fresh complete finance capture into a new output directory.
5. Add a committed capture evaluator using existing realism helpers.
6. Evaluate legacy and semantic-v2 using identical generated inputs, seeds, and locales.
7. Fix only defects demonstrated by the evaluator.
8. Re-run the full focused suite after each defect fix.
9. Run all monorepo quality gates.
10. Add changesets and documentation.
11. Review the complete diff for scope and unrelated changes.
12. Keep legacy as default unless the plan's statistical promotion gates are actually satisfied.
13. Commit only after confirming the result is demonstrably better and the user requests or approves committing.

## Important Technical Warnings

- Do not weaken relationship validation to make capture pass.
- Do not treat accepted-role coverage as a quality metric by itself; semantic-v2 is intentionally more conservative.
- Do not count the supplied finance app or the 285/311 cohort as sealed generalization evidence.
- Do not expose authored or generated row values in normal logs.
- Do not move the archive into the repository; it is a local evaluation input only.
- Do not assume the first capture metrics remain valid after the latest repairs.
- Do not merge the SPI and generator worktrees into one commit.
- Do not promote semantic-v2 based on a single finance service.
