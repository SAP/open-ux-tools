---
'@sap-ux/telemetry': patch
---

FIX: reporting functions now respect the persisted `enableTelemetry` setting in addition to environment variables (`DO_NOT_TRACK`, `SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY`). Previously, `reportRuntimeError` (called when `initTelemetrySettings` fails) and `reportEnableTelemetryOnOff` only checked environment variables, potentially transmitting events even when a user had run `telemetry disable`.
