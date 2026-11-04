---
"@sap-ux/preview-middleware": patch
---

FIX: reject an empty clientId in the RTA relay result-body validation so a malformed request returns 400 instead of 409.
