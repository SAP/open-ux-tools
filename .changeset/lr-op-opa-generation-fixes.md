---
"@sap-ux/ui5-test-writer": patch
---

FIX: correct List Report and Object Page OPA test generation for multi-tab, custom filter fields, and semantic-key adaptation

- Use stable OData property names (`iCheckFilterField({ property })`) for standard filter fields instead of translatable labels; custom filter fields fall back to their resolved label
- Exclude `@UI.HiddenFilter` and already-present properties from the semantic-key "add to filter bar" test, and add a value placeholder to `iChangeFilterField`
- Correct Given/When/Then subjects in the semantic-key adaptation block
- Target the correct table on multi-tab List Reports via `onTable("<key>")` and switch tabs with `iGoToView({ key })` before checking each tab's rows
- Object Page navigation from a multi-tab parent List Report now targets the parent's default tab
