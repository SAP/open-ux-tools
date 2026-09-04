# Production-Bound Realism Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the realism exporter execute and fingerprint the exact checksum-verified production model manifest/cache instead of reconstructing a stale pilot runtime.

**Architecture:** The pilot repository remains a read-only source for the judge prompt and output schema. A separate frozen, service/source-family-disjoint cohort supplies the metadata fixtures and selections. Focused evaluation helpers validate command inputs, create a portable candidate binding from the parsed production manifest plus the verified cache, and fail closed on empty resources or incoherent assertions; the CLI creates inference exclusively through the package's public `createLearnedRuntime` API and rejects partial/degraded learned runtimes before generating evidence.

**Tech Stack:** Node.js 22 ESM, JavaScript evaluation scripts, TypeScript/Jest integration tests, SHA-256 evidence bindings, `@sap-ux/mockserver-data-generator` public model APIs, pnpm 11.

---

## File structure

- Create `scripts/mockserver-data-generator-evaluation/lib/realism-candidate.mjs`: parse the two campaign command shapes and create privacy-safe, reproducible bindings for a verified production model.
- Modify `scripts/mockserver-data-generator-evaluation/prepare-realism-campaign.mjs`: replace manual pilot model construction with `parseModelManifest`, `verifyModelCache`, and `createLearnedRuntime`; make the entry point import-safe for tests.
- Create `tests/integration/mockserver-data-generator/src/evaluation/realism-candidate.test.ts`: cover export/compile argument contracts, verified-cache requirements, and visible generation-config binding.
- Modify `scripts/mockserver-data-generator-evaluation/README.md`: document the production manifest/cache command and evidence semantics.
- Modify `docs/quality/mockserver-data-generator-model-evaluation.md`: record the corrected production-bound packet and distinguish it from historical pilot judge evidence.
- Modify `docs/superpowers/plans/2026-09-03-mockserver-data-generator.md`: append the Phase 10 implementation record and remaining independent-review gate.

### Task 1: Freeze the production-bound command and binding contract

**Files:**

- Create: `scripts/mockserver-data-generator-evaluation/lib/realism-candidate.mjs`
- Create: `tests/integration/mockserver-data-generator/src/evaluation/realism-candidate.test.ts`

- [x] **Step 1: Write the failing export argument test**

```ts
expect(
    parseRealismCampaignArguments([
        '--export',
        '--pilot-root',
        '/tmp/pilot',
        '--model-manifest',
        '/tmp/model-manifest.json',
        '--model-cache',
        '/tmp/model-cache',
        '--out',
        '/tmp/evidence.json',
        '--campaign-manifest-out',
        '/tmp/campaign.json'
    ])
).toMatchObject({
    mode: 'export',
    modelManifest: '/tmp/model-manifest.json',
    modelCache: '/tmp/model-cache',
    seed: 113
});
expect(() =>
    parseRealismCampaignArguments([
        '--export',
        '--pilot-root',
        '/tmp/pilot',
        '--out',
        '/tmp/evidence.json',
        '--campaign-manifest-out',
        '/tmp/campaign.json'
    ])
).toThrow('--model-manifest must be an absolute path');
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
export PATH=/Users/I335123/.nvm/versions/node/v22.22.2/bin:$PATH
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests exec jest \
  --runInBand src/evaluation/realism-candidate.test.ts
```

Expected: FAIL because `realism-candidate.mjs` and `parseRealismCampaignArguments` do not exist.

- [x] **Step 3: Add the minimal parser**

```js
export function parseRealismCampaignArguments(argv) {
    const input = argv[0] === '--' ? argv.slice(1) : argv;
    const exportMode = input.includes('--export');
    const compileMode = input.includes('--compile');
    if (exportMode === compileMode) {
        throw new TypeError('Choose exactly one of --export or --compile');
    }
    const pilotRoot = absoluteOption(input, '--pilot-root');
    const output = absoluteOption(input, '--out');
    if (exportMode) {
        return {
            mode: 'export',
            pilotRoot,
            output,
            manifest: absoluteOption(input, '--campaign-manifest-out'),
            modelManifest: absoluteOption(input, '--model-manifest'),
            modelCache: absoluteOption(input, '--model-cache'),
            seed: parseSeed(input)
        };
    }
    return parseCompileArguments(input, pilotRoot, output);
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2.

Expected: PASS for absolute export inputs, missing/relative model inputs, compile inputs, unknown options, and duplicate singleton options.

- [x] **Step 5: Write the failing verified-model binding test**

Create a temporary generation-config file with `maxNewTokens: 300`, a two-component manifest, and a complete `VerifiedModelCache`. Assert that the binding contains the manifest hash/revision, both component fingerprints, every artifact hash, and the parsed generation configuration; assert that an incomplete cache and a missing classifier/SFT component are rejected.

- [x] **Step 6: Run the focused test and verify RED**

Run the command from Step 2.

Expected: FAIL because `createVerifiedModelBinding` does not exist.

- [x] **Step 7: Implement the minimal binding helper**

```js
export async function createVerifiedModelBinding({ manifestPath, manifestSource, manifest, cache }) {
    if (!cache.ready) {
        throw new TypeError('Realism export requires a complete checksum-verified model cache');
    }
    const classifier = requiredComponent(manifest, 'classifier');
    const sft = requiredComponent(manifest, 'sft');
    const generationConfigPath = requiredCachedRole(cache, sft.id, 'generation-config');
    const generationConfigSource = await readRegularFile(generationConfigPath, 'SFT generation config');
    const generationConfig = JSON.parse(generationConfigSource);
    return Object.freeze({
        manifest: manifestRecord(manifestPath, manifestSource, manifest),
        components: componentRecords([classifier, sft]),
        artifacts: artifactRecords([classifier, sft]),
        generationConfig: Object.freeze({
            bytes: Buffer.byteLength(generationConfigSource),
            sha256: sha256(generationConfigSource),
            configuration: generationConfig
        })
    });
}
```

- [x] **Step 8: Run the focused test and verify GREEN**

Run the command from Step 2.

Expected: PASS with no local cache paths or model URLs in the serialized binding.

### Task 2: Execute the exact verified runtime

**Files:**

- Modify: `scripts/mockserver-data-generator-evaluation/prepare-realism-campaign.mjs`
- Modify: `tests/integration/mockserver-data-generator/src/evaluation/realism-candidate.test.ts`

- [x] **Step 1: Write the failing runtime-readiness test**

Exercise an exported `assertCompleteLearnedRuntime` helper with a classifier-only runtime and with non-empty diagnostics. Assert both fail, while a classifier-plus-SFT runtime with no diagnostics passes.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
export PATH=/Users/I335123/.nvm/versions/node/v22.22.2/bin:$PATH
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests exec jest \
  --runInBand src/evaluation/realism-candidate.test.ts
```

Expected: FAIL because the readiness assertion is absent.

- [x] **Step 3: Replace pilot runtime construction**

```js
const manifestSource = await readRegularFile(options.modelManifest, 'model manifest');
const modelManifest = generator.parseModelManifest(JSON.parse(manifestSource));
const verifiedCache = await generator.verifyModelCache(options.modelCache, modelManifest);
const modelBinding = await createVerifiedModelBinding({
    manifestPath: options.modelManifest,
    manifestSource,
    manifest: modelManifest,
    cache: verifiedCache
});
const learned = await generator.createLearnedRuntime(modelManifest, verifiedCache);
assertCompleteLearnedRuntime(learned);
```

Delete `createPilotRuntime`, remove pilot model paths, and derive the campaign's component/artifact/config bindings from `modelBinding`. Keep disposal in `finally`.

- [x] **Step 4: Make the CLI import-safe and route through the parser**

```js
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
        process.exitCode = 1;
    });
}
```

- [x] **Step 5: Run focused and complete evaluation tests**

Run:

```bash
export PATH=/Users/I335123/.nvm/versions/node/v22.22.2/bin:$PATH
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests test
```

Expected: all evaluation/integration suites PASS.

- [x] **Step 6: Build and run static gates**

Run:

```bash
export PATH=/Users/I335123/.nvm/versions/node/v22.22.2/bin:$PATH
pnpm --filter @sap-ux/mockserver-data-generator build
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests build
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests lint
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 7: Commit the production-bound exporter**

```bash
git add scripts/mockserver-data-generator-evaluation \
  tests/integration/mockserver-data-generator/src/evaluation/realism-candidate.test.ts \
  docs/superpowers/plans/2026-09-04-production-bound-realism-campaign.md
git commit -s -m "fix(mockserver-data-generator): bind realism to production model"
```

### Task 3: Regenerate and reconcile realism evidence

**Files:**

- Modify: `scripts/mockserver-data-generator-evaluation/README.md`
- Modify: `docs/quality/mockserver-data-generator-model-evaluation.md`
- Modify: `docs/superpowers/plans/2026-09-03-mockserver-data-generator.md`
- Create outside the repository: `/Users/I335123/Downloads/mockserver-data-generator-realism-2026-09-04/realism-evidence.json`
- Create outside the repository: `/Users/I335123/Downloads/mockserver-data-generator-realism-2026-09-04/realism-campaign.json`

- [x] **Step 1: Run the corrected exporter**

```bash
export PATH=/Users/I335123/.nvm/versions/node/v22.22.2/bin:$PATH
pnpm mockserver-data-generator:realism-campaign --export \
  --pilot-root /Users/I335123/SAPDevelop/Projects/sap-ai-mockserver \
  --selection-manifest /Users/I335123/Downloads/mockserver-data-generator-realism-final-cohort-v1/final-cohort-v1.json \
  --model-manifest /private/tmp/mockgen-current-model-22000e20/model-manifest.json \
  --model-cache /private/tmp/mockgen-current-model-22000e20/cache \
  --out /Users/I335123/Downloads/mockserver-data-generator-realism-final-cohort-v1/realism-evidence-v20.json \
  --campaign-manifest-out /Users/I335123/Downloads/mockserver-data-generator-realism-final-cohort-v1/campaign-manifest-v20.json
```

Expected: at least 300 blinded fields, a new evidence fingerprint, a new candidate fingerprint, and a campaign binding whose generation config contains `maxNewTokens: 300`.

Observed: 311 blinded records, 178/178 parsed responses, 821/846 accepted
eligible fields, all six targets contributing, all six structural targets
passing, and an evidence file that was byte-identical on the v21 replay. The
campaign uses `sftTimeoutMs: 90000` because the timeout covers the bounded set
of per-entity completions for wide schemas; it does not change the model or the
frozen 300-token per-completion configuration.

- [x] **Step 2: Verify the sealed outputs independently**

Recompute both file hashes and the campaign fingerprint, confirm the evidence fingerprint validates through `sealRealismEvidence`, confirm no absolute local path or model URL occurs in either artifact, and confirm the package commit/model manifest revision/component fingerprints match the executed candidate.

- [x] **Step 3: Reconcile historical judgments without overstating them**

Compare the new candidate/evidence fingerprints with retained pilot reports. Preserve those reports as historical baselines; do not reuse their verdicts when fingerprints differ and do not initiate paid provider calls without explicit authorization.

- [x] **Step 4: Document the command, evidence, and remaining gate**

Update the evaluation README with both required model options. Record the exact external artifact directory, hashes, model revision, field coverage, and configuration in the quality document and parent implementation plan. State explicitly whether only packet generation is complete or fresh dual-provider consensus has also passed.

- [x] **Step 5: Re-run focused gates and commit documentation**

```bash
export PATH=/Users/I335123/.nvm/versions/node/v22.22.2/bin:$PATH
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests test
pnpm --filter @sap-ux-private/mockserver-data-generator-integration-tests lint
git diff --check
git add scripts/mockserver-data-generator-evaluation/README.md \
  docs/quality/mockserver-data-generator-model-evaluation.md \
  docs/superpowers/plans/2026-09-03-mockserver-data-generator.md
git commit -s -m "docs(mockserver-data-generator): record production realism packet"
```

Expected: tests and lint pass; the commit contains documentation only.

## Self-review

- Spec coverage: the plan addresses the Phase 10 requirement to bind the exact package/model/runtime configuration while retaining the pilot harness and historical evidence. It does not claim or trigger the separately authorized two-provider review.
- Placeholder scan: every command and path is concrete; the plan contains no deferred implementation markers.
- Type consistency: CLI names are `modelManifest` and `modelCache`; binding names are `manifest`, `components`, `artifacts`, and `generationConfig`; the same names are used in the tests, helper, exporter, and documentation.
