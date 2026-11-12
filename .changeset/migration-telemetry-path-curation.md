---
'@sap-ux/fiori-migration-writer': patch
---

fix: do not report absolute filesystem paths in migration error telemetry. Node file system errors are reduced to their error code and the offending file name only; directories (which can contain user, customer or workspace names) are removed. The `determineMessage` fallback and the previously raw `error.message` pass-throughs in `ProjectMigrator`, `BulkProjectMigrator` and project discovery now emit path-free descriptions.
