---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Generate Contact Card OPA5 tests across Object Page header field groups, body-section forms, body-section tables, and List Report tables. `DataFieldForAnnotation::<property>::Contact` entries are detected in the spec model and emitted as `iClickLink({ property: "<property>/Contact" })` followed by `iCheckContactDialog({ controlType: "sap.ui.mdc.link.Panel" })`. Drops the `iPressSectionIconTabFilterButton` page-object workaround in favor of the public `iGoToSection` API and unconditionally emits `iCheckNumberOfSections` (now valid for any section count).
