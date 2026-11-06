---
'@sap-ux/mock-data-generator': patch
---

FIX: Report a value help whose supplied rows receive no new rows

A value list whose rows are supplied keeps exactly those rows. It is now always reported with `ROW_COUNT_REDUCED_AUTHORED_DOMAIN`, also when it holds as many rows as were requested or more, so a caller that expects the requested rows after the supplied ones knows why none were added.
