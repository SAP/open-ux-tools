---
"@sap-ux/deploy-tooling": patch
---

FIX: Replace require() with dynamic import() in bin/deploy and bin/undeploy shims to fix ReferenceError in ESM context
