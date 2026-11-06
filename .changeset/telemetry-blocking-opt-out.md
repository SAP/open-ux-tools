---
'@sap-ux/telemetry': patch
---

Fix `reportBlocking` and `reportEventBlocking` sending events although the user disabled telemetry. The `ignoreSettings` parameter of `reportBlocking` is deprecated and has no effect on the opt-out.
