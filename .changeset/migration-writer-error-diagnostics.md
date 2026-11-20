---
"@sap-ux/fiori-migration-writer": minor
---

FEAT: migration error messages tell what failed. They add the step of the migration and the error code, for example `(code: EACCES, step: applyTemplates)`, and name the file of file system errors relative to the project instead of showing the absolute path. `EACCES` is handled like `EPERM`, and a message is never empty. Messages that are written for the user (such as an unsupported project) stay unchanged. Texts no longer HTML-escape `/` in file names
