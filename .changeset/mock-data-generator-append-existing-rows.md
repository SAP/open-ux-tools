---
'@sap-ux/mock-data-generator': minor
---

FEAT: Append the requested rows after the rows already in the mock data folder instead of filling the set up to the requested size

Rows the caller supplies are published exactly as written: a field a row leaves out is no longer filled from a generated row. The requested rows follow them, and a new row repeats no key, semantic key or alternate key of a supplied row. The supplied rows of a value list stay its whole domain. A set that would grow past 1,000 rows receives fewer new rows and the `ROW_COUNT_REDUCED_ROW_LIMIT` warning.
