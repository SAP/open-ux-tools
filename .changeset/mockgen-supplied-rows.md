---
"@sap-ux/mock-data-generator": patch
---

FIX: Generate services whose applications ship their own mock data files

Applications often ship mock data written by earlier tools: placeholder values made from the column
name and a row number (`Co1` in a country column), columns the current metadata no longer declares,
values outside the declared facets, and references to rows that do not exist. Generation failed on
such files ("Semantic validation failed for BankAddress.Country"). Supplied rows are now published
exactly as written: a format such as country or email is not claimed for a column the supplied rows
contradict, derived values and projections no longer overwrite supplied cells, undeclared columns and
unresolved references in supplied rows are kept and reported with `SUPPLIED_REFERENCE_UNRESOLVED`, and
generated rows that repeat a supplied key are replaced by the next generated row. References to an
entity set with supplied rows resolve against every row it publishes — the supplied rows and the
generated ones — so a related set such as a bank's addresses is no longer cut down to the number of
supplied rows. Supplied rows that share a key with each other still stop generation, now with a
message naming the file to correct.
