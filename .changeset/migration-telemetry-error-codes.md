---
"@sap-ux/fiori-migration-writer": patch
---

FIX: Send error codes instead of error text in migration telemetry for GDPR compliance. Extended Message interface with optional code field, created MigrationErrorCode enum and extractErrorCode() utility. BulkProjectMigrator now attaches error codes to all error messages. Error codes are safe for telemetry while full error text remains in local logs.
