---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Reset mock and test data at the start of every generated FE V4 journey. Each journey now calls `iResetMockData({ ServiceUri })` and `iResetTestData()` before `iStartMyApp()` so data manipulations from earlier journeys (or a developer's own tests) do not affect later ones.
