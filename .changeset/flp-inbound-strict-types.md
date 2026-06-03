---
'@sap-ux/flp-config-inquirer': patch
'@sap-ux/adp-flp-config-sub-generator': patch
---

fix: align inbound iteration with strict `ManifestNamespace.Inbound` types

`ManifestNamespace.Inbound` is a record keyed by inbound id; its values describe
each inbound. Drop incorrect destructuring annotations that typed the value as
the full record, and use optional chaining for the optional `signature` field.
No runtime change.
