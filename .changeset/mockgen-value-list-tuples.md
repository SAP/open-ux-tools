---
"@sap-ux/mock-data-generator": patch
---

FIX: Keep generated rows members of their value-list tuples instead of failing the whole service

About one in seven real SAP services stopped with "Semantic tuple validation failed" because the rows
that reference a value help could not be kept consistent with it:

- A field's display text was linked to the text of every mapped value-help key, so a supplier name
  could be filled with a product name and the check could never pass. It now mirrors only the text of
  the key the field itself maps to.
- Value-help `In` parameters and constants were never written, fields shared by several value lists
  were blocked by their own earlier choice, and one field could be both an input and an output of a
  list with different values. Value lists that share fields are now solved together, `In`
  parameters are filled from the chosen value-help row, and when no row fits, the generated value help
  receives one new row carrying the owner's fixed values.
- Count derivation, derived parent-child links, temporal ordering and the currency and country
  providers could rewrite a value-list field or text after it had been copied. They now leave
  value-list fields alone, and providers run before owners copy their texts.

Rows that genuinely cannot be members — a protected key already bound to a conflicting value-help
row, or metadata where the two sides have incompatible types — are generated and reported as
`SEMANTIC_DOMAIN_CONFLICT` warnings instead of aborting generation.
