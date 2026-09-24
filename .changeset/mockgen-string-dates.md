---
"@sap-ux/mock-data-generator": patch
---

FEAT: Fill string columns that the classifier recognises as dates with dates

When the classifier accepts a date role (`date`, `datetime`, `start_date`, `end_date`) for a non-key
string column, the column now gets dates in the format its declared length implies — 8 characters
`yyyymmdd`, 10 an ISO date, 14 `yyyymmddhhmmss`, 19 or more (or no limit) an ISO date-time — instead of
being rejected as an incompatible type. Columns of other lengths keep the typed fallback. The role
registry the classifier head is bound to is unchanged; string dates take no part in temporal ordering.
