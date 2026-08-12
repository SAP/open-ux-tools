---
'@sap-ux/ui5-test-writer': minor
---

FEAT: Generate TypeScript OPA5 tests for FPM pages and add WithAnd<T> fluent `.and` chaining support

- FPM (`sap.fe.core.fpm`) pages no longer force generated OPA5 tests to JavaScript; they now honour the configured/auto-detected TypeScript setting, emitting `FPMJourney.ts` and `pages/FPM.ts` symmetric with the List Report / Object Page templates. The FPM page is constructed via `sap/fe/test/TemplatePage` (cast to work around the missing `sap/fe/test/FPM` type in `@sapui5/types`).
- Generated `OpaJourneyTypes.gen.d.ts` now emits a `WithAnd<T>` utility type and wraps each page's `When`/`Then` intersection in it, enabling the OPA5 fluent `.and.iCheckX()` chaining pattern in TypeScript journeys. The standalone splicer backfills the `WithAnd<T>` definition into type files generated before this change.
