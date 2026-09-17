---
"@sap-ux/eslint-plugin-fiori-tools": patch
---

FIX: Rebuild bundle — 10.10.0 was published with a broken esbuild output that left @babel/eslint-parser unbundled, causing ERR_MODULE_NOT_FOUND in consumer projects
