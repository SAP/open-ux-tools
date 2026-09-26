---
"@sap-ux/mock-data-generator": patch
---

FEAT: Accept temporal roles on column types their values fit

A `date` role on a date-time column, a `datetime` role on a date column, and a `time` role on a string column
of 6 (`HHMMSS`) or at least 8 characters (`HH:MM:SS`) are now accepted and filled, from metadata, the
classifier or the lexical route; so are string-typed dates from every route. Keys and other type mismatches
keep the typed fallback, and the role registry the classifier is bound to is unchanged.
