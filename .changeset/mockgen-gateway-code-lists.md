---
"@sap-ux/mock-data-generator": patch
---

FIX: Fill SAP Gateway's currency and unit code lists coherently from each row's code

RAP services expose `SAP__Currencies` and `SAP__UnitsOfMeasure`, which UI5 reads to format amounts
and quantities. Their columns were generated independently, so a row could pair one currency code
with another currency's ISO code and a random number of decimals. They are now handled like CAP's
common code lists: the code key is routed to its role and the ISO code, external code, text and
decimal places are filled from that row's code (EUR, EUR, Euro, 2 or KG, KGM, Kilogram, 3). Only the
reserved `SAP__` sets with their standard code key are affected.
