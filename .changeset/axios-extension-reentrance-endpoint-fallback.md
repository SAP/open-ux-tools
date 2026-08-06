---
"@sap-ux/axios-extension": patch
---

FIX: Reentrance-ticket logon probes the cloud endpoint (`/sap/bc/sec/reentrance`) and falls back to the ADT endpoint (`/sap/bc/adt/core/http/reentranceticket`) when it returns 404, before opening the browser, so internal/older ABAP systems can be logged on to
