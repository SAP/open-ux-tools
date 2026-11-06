---
'@sap-ux/mock-data-generator': patch
---

FIX: Keep generated rows consistent across entity sets and with their metadata

Give the text next to a reference the text of the referenced row, repeat the referenced row's semantic key and keep semantic keys unique, make each row of a country or currency entity describe one record, fill the unit field of a measured field with units of its dimension, keep digit-sequence and upper-case facets (a country code in a digit field is its ISO 3166-1 numeric code), order unrelated dates and times by declaration instead of giving them one instant, never repeat identifiers when reusing model rows, move model e-mail and web addresses to reserved domains, give the model the priority targets first, and report each tier's own duration in progress events.
