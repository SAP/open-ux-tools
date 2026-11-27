---
"@sap-ux/fiori-migration-writer": patch
---

FIX: Attach error codes at source for GDPR-compliant telemetry. MigrationError and UnsupportedProjectError now include code fields, eliminating regex extraction in callers.
