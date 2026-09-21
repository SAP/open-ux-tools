---
"@sap-ux/eslint-plugin-fiori-tools": patch
---

FIX: Add defensive checks to esbuild.mjs to fail fast if @babel/eslint-parser is not installed and assert no @babel/* imports leak into the bundle after build
