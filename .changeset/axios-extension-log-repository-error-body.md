---
"@sap-ux/axios-extension": patch
---

FIX: Surface the Gateway error reason (message and code) on the error thrown when a UI5 ABAP repository application lookup fails, so the underlying 4xx/5xx cause is visible at normal log levels; the full response body is still logged at debug level only (#4272)
