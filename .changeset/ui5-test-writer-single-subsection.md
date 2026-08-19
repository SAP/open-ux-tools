---
"@sap-ux/ui5-test-writer": patch
---

FIX: Object Page OPA tests no longer emit `iCheckSubSection`/`iGoToSection(subSection)` for sections that render a single sub-section (e.g. a form-only CollectionFacet). Fiori elements renders such a section inline with no distinct sub-section, so the assertion had no matching control. Sub-section assertions are now only generated when a section has more than one sub-section.
