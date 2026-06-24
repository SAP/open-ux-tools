---
'@sap-ux/ui5-test-writer': patch
---

FIX: Handle `@UI.ConnectedFields` and `@UI.FieldGroup` wrappers in body sub-section form fields and emit one `iCheckField` per inner property with the `connectedFields` / `fieldGroup` qualifier on the `FieldIdentifier`.
