---
"@sap-ux/backend-proxy-middleware": minor
"@sap-ux/preview-middleware": minor
"@sap-ux/reload-middleware": minor
"@sap-ux/serve-static-middleware": minor
"@sap-ux/ui5-proxy-middleware": minor
---

FEAT: Widen express peerDependency from "4" to "^4 || ^5" to unblock downstream consumers migrating from express 4 to 5. Express v4 consumers are unaffected; devDependencies stay at 4.22.1 for reproducible test runs.
