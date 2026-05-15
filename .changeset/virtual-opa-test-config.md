---
"@sap-ux/ui5-test-writer": minor
"@sap-ux/fiori-elements-writer": minor
"@sap-ux/fiori-freestyle-writer": minor
"@sap-ux/app-config-writer": patch
---

feat: support virtual preview endpoints for test generation

When `useVirtualPreviewEndpoints` is enabled, test harness files (testsuite, unitTests, opaTests) are served virtually and not written to disk. UI5 yaml files are updated with `flp.path: test/flp.html` and test framework entries (OPA5, Testsuite, QUnit) are added to ui5-mock.yaml.
