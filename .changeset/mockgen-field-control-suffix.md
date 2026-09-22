---
"@sap-ux/mock-data-generator": patch
---

FIX: Route integer `_fc` field-control properties to the field-control role

RAP generates an integer `<Field>_fc` property for every field with dynamic field control. The lexical
rule for the field-control role already recognised these properties but refused them behind its
precision gate, so their cells fell to the typed floor with arbitrary integers. An integer `_fc`
property now takes the role and gets valid field-control values (0, 1, 3, 7).
