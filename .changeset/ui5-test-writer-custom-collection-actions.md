---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Generate OPA action tests for custom (manifest-declared) actions, matched by their (i18n-resolved) label via `iCheckAction("<label>")`. Custom-action tests are emitted only for the `latest` template bucket, where the required `sap.fe.test.api` support is available. Also fix bound actions with a collection binding parameter: they are now correctly treated as bound (`unbound: false`) and disabled-by-default (require a selection), matching the SAP FE runtime.
