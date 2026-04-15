<!-- 💡 A Technical Backlog Item (TBI) should contain the technical requirements that must be implemented to fulfill the functional needs. -->
<!-- 🔎 Please search existing issues to avoid creating duplicates. -->

### Description (include screenshots)

Four independent internal refactors to `@sap-ux/cf-deploy-config-writer` that reduce complexity and eliminate architectural friction in the MTA configuration layer. No public API or `mta.yaml` output is affected. Done when all four branches are reviewed and merged to `main`.

**Candidate 2 — AppRouter Orchestration (`appendAppRouter`)**
`appendAppRouter()` in `app-config.ts` was mutating `cfConfig` at four separate points interleaved with async MTA calls, making the final state hard to reason about. `destinationName` is now resolved upfront and all `cfConfig` mutations are grouped into a single block after MTA state is finalised. An early-return guard replaces the wrapping `if (mtaInstance)` block.

**Candidate 3 — Hardcoded MTA Timing Delays**
`getMtaConfig()` and `generateCAPConfig()` used fixed `setTimeout` delays (up to 5 × 1000 ms) to work around `@sap/mta-lib` requiring `mta.yaml` to be fully written before it can be parsed. Replaced with `waitForMtaFile()` — a predicate-based poller that returns as soon as the file is ready. New file: `src/mta-config/wait-for-mta.ts`.

**Candidate 4 — Global BTP Destinations Cache**
`getBTPDestinations()` and `getDestinationProperties()` in `utils.ts` used a module-level variable to cache BTP destinations for the lifetime of the process, causing cross-test contamination and preventing mid-session refresh. The module-level variable is removed; both functions now accept an optional `cache` parameter scoped to the call site. Backwards-compatible — existing callers are unaffected.

**Candidate 5 — Scattered Template Rendering**
EJS template rendering (`readFileSync` + `render` + `writeFileSync`) was duplicated across `mta.ts` and `index.ts` with hardcoded `__dirname`-relative paths inside business logic. Consolidated into a single `renderTemplateToDisk()` function in `src/mta-config/template-renderer.ts`, making the intentional `mem-fs` bypass explicit and documented.

### Value

- **Maintainability**: Each change narrows the scope of individual functions and files, reducing the cost of future modifications.
- **Quality**: Eliminates hidden side-effects (scattered mutations, process-wide cache, silent delays) that have caused test-order dependencies and hard-to-diagnose failures.
- **Testability**: New units (`waitForMtaFile`, `renderTemplateToDisk`, scoped cache) are independently testable without full MTA fixture setup.

### Architecture Elaboration

No. All changes are internal to `@sap-ux/cf-deploy-config-writer`. Public API signatures (`generateAppConfig`, `generateBaseConfig`, `generateCAPConfig`) and `mta.yaml` output format are unchanged.

### Notes

- Each candidate is on its own isolated branch with a changeset; they can be reviewed and merged independently.
- The `MtaConfig` god-class decomposition (Candidate 1 — `MtaDeployment` builder) is a larger change and is tracked separately.
- Branches:
  - `refactor/cf-deploy-config-approuter-mutations`
  - `refactor/cf-deploy-config-hardcoded-delays`
  - `refactor/cf-deploy-config-btp-destinations-cache`
  - `refactor/cf-deploy-config-template-rendering`

### Tasks

- [ ] Review and merge `refactor/cf-deploy-config-approuter-mutations` — group `cfConfig` mutations in `appendAppRouter`
- [ ] Review and merge `refactor/cf-deploy-config-hardcoded-delays` — replace hardcoded MTA delays with predicate-based polling
- [ ] Review and merge `refactor/cf-deploy-config-btp-destinations-cache` — scope BTP destinations cache to call site
- [ ] Review and merge `refactor/cf-deploy-config-template-rendering` — consolidate disk-write template rendering
