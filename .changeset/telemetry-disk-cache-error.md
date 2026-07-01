---
"@sap-ux/telemetry": patch
---

FIX: Wrap setUseDiskRetryCaching call in try-catch to handle "Not implemented" error that can be thrown in some environments
