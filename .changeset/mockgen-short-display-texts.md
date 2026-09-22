---
"@sap-ux/mock-data-generator": patch
---

FIX: Fill short text columns from longer value-help texts instead of failing generation

An analytical service can show a 15-character currency name next to a currency code whose value help
holds 40-character names. When a name did not fit, the text column kept a text from another currency
and the tuple check stopped the whole generation ("Semantic tuple validation failed for
SEPMRA_C_ALP_SlsOrdItemCubeALPResults.Currency" on the sales order analysis service). The text column
now receives the leading characters of its row's value-help text, as the backend would, and the tuple
check compares against the same shortened text, so a text from a different row is still rejected.
Currency names written by the currency and code-list providers are shortened the same way.
