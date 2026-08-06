---
"@sap-ux/axios-extension": patch
---

FIX: Reentrance-ticket connections no longer crash when the ABAP virtual host endpoint returns no related URLs (e.g. `{}` when UCON is not active); the configured system URL is used directly for the UI and API host, matching ADT behaviour
