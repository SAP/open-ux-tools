---
'@sap-ux/fiori-freestyle-writer': patch
'@sap-ux/fiori-elements-writer': patch
'@sap-ux/ui5-test-writer': patch
'@sap-ux/app-config-writer': patch
---

skip test harness files when virtual preview endpoints are enabled; serve them via fiori-tools-preview middleware instead; warn when QUnit init script is deleted and test files may not match the default discovery pattern
