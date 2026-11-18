---
'@sap-ux/create': minor
---

FEAT: add telemetry to the `migrate` command, aligned with the migration events of the IDE (`MIGRATION_BACKEND_LOAD`, `MIGRATION_SUCCESS`, `MIGRATION_FAILED`, `MIGRATION_COMPLETED`, with `source: 'CLI'`), and add the `telemetry enable|disable|status` command to manage the shared Fiori tools telemetry setting. Error categorization now prefers structured error codes from `@sap-ux/fiori-migration-writer` when available, falling back to regex pattern matching for backward compatibility.
