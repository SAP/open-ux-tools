# Semantic-planner Corrections Implementation Plan

**Goal:** Implement the approved correction plan without promoting semantic-v2 or changing normal host activation.

**Architecture:** Bind semantic-v2 routing to calibrated evidence, verified model inputs, executable generation constraints and independently checked outputs. Preserve authored sources. The user waived legacy-output compatibility; do not retain unsupported business assumptions for compatibility.

**Tech Stack:** TypeScript, Jest, Node evaluation scripts, pnpm, native ONNX runtime.

## Execution checklist

- [x] Replace compatibility freeze with evidence-first domains, replaceable descriptive samples and explicit synthetic scenarios.
- [x] Reproduce and fix v3 abstention, thresholds and prediction-set membership in classifier and resolver.
- [ ] Reproduce and fix v3 encoder/tokenizer identity and bounded priority-aware input projection.
- [x] Reproduce and fix semantic-v2 provider batching, per-field failure isolation and cancellation.
- [x] Reproduce and fix semantic validation, invalid IBAN/email output and authored value-help precedence.
- [ ] Bind generation decisions to providers, domain constraints and post-generation validation; report unsupported coverage.
- [ ] Reproduce and fix capture execution mode, protocol and empty-file source ownership.
- [ ] Reproduce and fix evaluator missing-resource and differently named relationship keys; independent invariants.
- [ ] Validate learned/live finance behavior, caches and UI navigation where local prerequisites permit.
- [ ] Run focused and workspace gates; document verified outcomes and remaining promotion gates.

For each behavior: add a regression, run it red, patch its cause, run it green. Focused command: `pnpm --filter @sap-ux/mockserver-data-generator test <test-file> --runInBand`. Script command: `node --test scripts/mockserver-data-generator-evaluation/*capture*.test.mjs`.

No commits, promotion or dependency changes are required to carry out this correction. Existing worktree changes remain owned by the user.

See the root PLAN.md implementation checkpoint for measured results and explicit remaining work.
Unchecked items include partially implemented work; they must not be interpreted as absent or complete.
