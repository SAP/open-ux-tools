---
"@sap-ux/deploy-tooling": patch
---

fix(deploy-tooling): normalize package name to uppercase in task (ui5-deploy) flow (#4453)

Moves package name normalization from `mergeConfig` (CLI-only) into `validateConfig` (shared), ensuring lowercase ABAP package names are uppercased with a warning in both the CLI and ui5-deploy task flows.
