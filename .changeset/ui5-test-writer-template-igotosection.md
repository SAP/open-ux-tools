---
'@sap-ux/ui5-test-writer': patch
---

FIX: Replace the deprecated `iPressEdit()`/`iPressSectionIconTabFilterButton()` calls in generated OPA tests with the current `iExecuteEdit()` and `iGoToSection({ section })` APIs, and drop the now-unneeded custom `iPressSectionIconTabFilterButton` helper from the page-object templates.
