---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Rework standalone OPA regeneration to preserve user files

Standalone OPA regeneration (`generateOPAFiles(..., standalone=true)`) no longer relocates an existing `integration/` folder to `integration_old/`. Instead the generator now coexists with the existing setup:

- New apps and apps without an `integration/` folder still receive a full test scaffold and a starter `FirstJourney.{js,ts}`.
- Apps with a compatible setup (own `pages/JourneyRunner.{js,ts}`) now have generator-owned files written with a `.gen` suffix; user files are preserved and the existing `JourneyRunner`, `opaTests.qunit.js` and `OpaJourneyTypes.d.ts` are spliced rather than rewritten.
- Apps with an incompatible setup (no own `JourneyRunner` but `JourneyRunner` references in `opaTests.qunit.js` or an `AllJourneys.json`) only receive `.gen` Page and Journey files; the existing test harness is left untouched and an info log explains why.

The same scenario flow now applies to TypeScript projects (`enableTypeScript: true`). `JourneyRunner.ts` is spliced via a new TS-aware splicer, `OpaJourneyTypes.d.ts` is updated through a new `opaJourneyTypesUtils` splicer, and the generator-owned `.gen` page entries always carry a `Generated` variable-name suffix to avoid collisions with hand-authored bindings to the same `targetKey`.

Splice helpers (`addPagesToJourneyRunner`, `addPathsToQUnitJs`, `addJourneysToOpaJourneyTypes`) accept an optional logger and warn instead of silently swallowing exceptions when an existing file cannot be updated.
