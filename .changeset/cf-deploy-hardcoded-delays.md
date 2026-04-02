---
"@sap-ux/cf-deploy-config-writer": patch
---

refactor: replace hardcoded MTA file operation delays with predicate-based polling

Introduces `waitForMtaFile()` in `src/mta-config/wait-for-mta.ts` that polls `fs.existsSync` + `Mta.getMtaID()` with a configurable timeout instead of sleeping for a fixed duration. Both `getMtaConfig()` and `generateCAPConfig()` now use this mechanism, eliminating up to 5 × 1000ms silent delays on slow file systems while still handling the mta-lib file-readiness requirement correctly.
