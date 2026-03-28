---
"@sap-ux/eslint-plugin-fiori-tools": patch
---

fix(eslint-plugin): add sap-no-global-define: off to testConfig

This fixes the "Definition for rule '@sap-ux/fiori-tools/sap-no-global-define' was not found" error when running ESLint on generated projects. The testConfig now explicitly sets the rule to 'off' so that eslint-disable comments in testsuite.qunit.js files are properly recognized.
