---
"@sap-ux/mock-data-generator": patch
---

FIX: Use realistic code lists for 27 concepts of the concept head

The value banks of 27 code concepts (for example payment blocking reasons, dunning keys and goods movement types)
are regenerated from their published concept descriptions as short, distinct codes. Which fields take a concept
is unchanged: prototypes, thresholds and per-concept minimums are identical, and the concept head accepts the
same fields as before.
