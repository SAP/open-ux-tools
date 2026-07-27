---
"@sap-ux/ui5-test-writer": patch
---

FIX: Only generate ux-specification-derived OPA journeys for List Report / Object Page (LROP) and Flexible Programming Model (FPM) apps. Object Page-only and Analytical List Page projects now receive the generic fallback FirstJourney instead. The fallback is also written (and wired into the existing `opaTests.qunit.js`) when regenerating an existing app whose test setup is compatible but produces no ux-spec journeys, without overwriting a user's existing fallback journey.
