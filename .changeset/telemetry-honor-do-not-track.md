---
'@sap-ux/telemetry': patch
---

FIX: document that init-failure diagnostics (`reportRuntimeError`) intentionally bypass the persisted `enableTelemetry` setting. This is by design: the error is reported when `initTelemetrySettings` fails, before the saved setting has been loaded. Users who want to disable all telemetry including init-failure reports can set the `DO_NOT_TRACK` or `SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY` environment variable.
