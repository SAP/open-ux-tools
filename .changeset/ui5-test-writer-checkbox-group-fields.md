---
'@sap-ux/ui5-test-writer': patch
---

FIX: Stop emitting unpassable `iCheckField` steps for ObjectPage checkbox-group fields. A nested all-boolean `UI.FieldGroup` renders as a group of checkboxes whose members are not addressable by the sap.fe.test.api form API; such fields are now emitted commented out with an explanatory note instead of as live assertions.
