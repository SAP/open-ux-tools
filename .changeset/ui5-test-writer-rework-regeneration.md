---
"@sap-ux/ui5-test-writer": minor
---

fix(ui5-test-writer): rework standalone OPA regeneration to preserve user files

Standalone OPA regeneration (`generateOPAFiles(..., standalone=true)`) no longer relocates an existing `integration/` folder to `integration_old/`. Instead the generator now coexists with the existing setup:

- New apps and apps without an `integration/` folder still receive a full test scaffold and a starter `FirstJourney.js`.
- Apps with a compatible setup (own `pages/JourneyRunner.js`) now have generator-owned files written with a `.gen` suffix; user files are preserved and the existing `JourneyRunner.js`/`opaTests.qunit.js` are spliced rather than rewritten.
- Apps with an incompatible setup (no own `JourneyRunner.js` but `JourneyRunner` references in `opaTests.qunit.js` or an `AllJourneys.json`) only receive `.gen` Page and Journey files; the existing test harness is left untouched and an info log explains why.

Splice helpers (`addPagesToJourneyRunner`, `addPathsToQUnitJs`) now accept an optional logger and warn instead of silently swallowing exceptions when an existing file cannot be updated.
