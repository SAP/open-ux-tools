---
"@sap-ux/backend-proxy-middleware-cf": patch
"@sap-ux/adp-tooling": patch
---

fix: handle both nested (`{ uaa: {...} }`) and flat destination-service credential shapes when fetching BTP destinations and when checking for OnPremise destinations during adaptation-project startup. A new `getDestinationServiceUaa` helper in `@sap-ux/adp-tooling` is reused by `@sap-ux/backend-proxy-middleware-cf` to avoid duplicate shape-handling logic.
