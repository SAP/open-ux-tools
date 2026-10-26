---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Retry transient startRTA key-user permission failures in the HTTP relay without reloading or replaying edits. Detect adaptation projects in the generic modification workflow and direct callers to the dedicated adaptation tools instead of listing unsupported operations or reporting an invalid project path.