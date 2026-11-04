---
"@sap-ux/preview-middleware": patch
---

FIX: the RTA relay browser client no longer stops polling when a result submission fails — the failed POST is logged and the poll loop continues, and a `__reload__` reloads the page even if its result POST throws.
