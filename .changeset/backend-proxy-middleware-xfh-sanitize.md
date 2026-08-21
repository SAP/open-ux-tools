---
"@sap-ux/backend-proxy-middleware": patch
---

FIX: Strip comma-joined x-forwarded-host before forwarding to BAS destination service to prevent "Illegal character in authority" HTTP 500
