---
"@sap-ux/mock-data-generator": patch
---

FIX: Apply the repetition penalty to value content only

The token that opens a value across the key boundary (a healed ` "`, a digit after the separator) and the token
that closes a string no longer count as repetitions, so later fields of a row are not pushed away from opening
a string.
