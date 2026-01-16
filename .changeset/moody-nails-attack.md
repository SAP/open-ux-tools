---
'@sap-ux/eslint-plugin-fiori-tools': minor
---

Fix plugin integration issue when working with multiple projects: create new ProjectContext and clear DiagnosticCache before running eslint on a file not in the current project.
